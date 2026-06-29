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
      // Support {{name}} or [name] or [ name ] personalization
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

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
      const batch = emailsToSend.slice(i, i + BATCH_SIZE);
      try {
        if (resend.batch && resend.batch.send) {
          const result = await resend.batch.send(batch);
          if (result.error) {
            failed += batch.length;
            errors.push(result.error.message);
            console.error('Resend delivery error:', result.error);
          } else {
            successful += batch.length;
          }
        } else {
          // Fallback if batch.send is missing in older SDKs (1 email per second)
          for (const email of batch) {
            const result = await resend.emails.send(email);
            if (result.error) {
              failed++;
              errors.push(result.error.message);
            } else {
              successful++;
            }
            await new Promise(resolve => setTimeout(resolve, 600)); // Sleep 600ms to respect 2 req/s
          }
        }
      } catch (err: any) {
        failed += batch.length;
        errors.push(err.message);
      }
    }

    if (failed > 0 && successful === 0) {
      // If ALL failed, return an error so the frontend toast shows it
      res.status(400).json({ error: `Failed to send emails: ${errors[0]}` });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Broadcast complete. Sent: ${successful}, Failed: ${failed}`,
      totalUsers: emailList.length,
      errors: failed > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Broadcast email error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default adminRouter;
