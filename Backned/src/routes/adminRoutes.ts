import express, { Response } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/authmiddleware.js';
import prisma from '../lib/prisma.js';
import { Resend } from 'resend';

const adminRouter = express.Router();

const resend = new Resend(process.env.RESEND_API_KEY || 'default_key');

adminRouter.post('/broadcast', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    const { subject, htmlBody, targetEmails, excludeEmails } = req.body;
    if (!subject || !htmlBody) {
      res.status(400).json({ error: 'Subject and HTML body are required' });
      return;
    }

    if (!process.env.RESEND_API_KEY) {
      res.status(500).json({ error: 'Resend API key is not configured on the server' });
      return;
    }

    let emailFilter: any = { not: '' };
    if (targetEmails && targetEmails.trim() !== '') {
      const emailArray = targetEmails.split(',').map((e: string) => e.trim()).filter(Boolean);
      if (emailArray.length > 0) {
        emailFilter = { in: emailArray };
      }
    }

    if (excludeEmails && excludeEmails.trim() !== '') {
      const excludeArray = excludeEmails.split(',').map((e: string) => e.trim()).filter(Boolean);
      if (excludeArray.length > 0) {
        emailFilter.notIn = excludeArray;
      }
    }

    const allUsers = await prisma.user.findMany({
      where: {
        email: emailFilter,
      },
      select: {
        email: true,
        name: true
      }
    });

    const emailList = allUsers.map(u => u.email).filter(Boolean);

    if (emailList.length === 0) {
      res.status(400).json({ error: 'No users to email' });
      return;
    }

    const emailsToSend = allUsers.map(user => {
      const personalizedSubject = subject
        .replace(/\{\{name\}\}/gi, user.name)
        .replace(/\[\s*name\s*\]/gi, user.name);

      const personalizedHtml = htmlBody
        .replace(/\{\{name\}\}/gi, user.name)
        .replace(/\[\s*name\s*\]/gi, user.name);

      return {
        from: 'DojoClass <onboarding@dojoclass.space>',
        to: user.email,
        subject: personalizedSubject,
        html: personalizedHtml,
      };
    });

    // Respond immediately to the frontend to prevent browser/Axios timeout
    res.status(200).json({
      success: true,
      message: `Broadcast started! 🚀 Sending to ${emailsToSend.length} users in the background to respect email rate limits. You can safely navigate away.`,
      totalUsers: emailsToSend.length
    });

    // Run the sending process in the background
    (async () => {
      let successful = 0;
      let failed = 0;
      
      console.log(`[Broadcast] Starting background send to ${emailsToSend.length} users...`);
      
      for (let i = 0; i < emailsToSend.length; i++) {
        try {
          const email = emailsToSend[i];
          const result = await resend.emails.send(email);
          
          if (result.error) {
            failed++;
            console.error(`[Broadcast] Failed to send to ${email.to}:`, result.error.message);
          } else {
            successful++;
          }
        } catch (err: any) {
          failed++;
          console.error(`[Broadcast] Exception sending to ${emailsToSend[i].to}:`, err.message);
        }
        
        // Strictly wait 1 second between emails to safely bypass the 2 requests/sec free tier limit
        if (i < emailsToSend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`[Broadcast] Complete! Sent: ${successful}, Failed: ${failed}`);
    })();

  } catch (error: any) {
    console.error('Broadcast email error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

export default adminRouter;
