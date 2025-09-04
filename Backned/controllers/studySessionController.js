import StudySession from "../models/StudySession.js";
import { User } from "../models/User.js";


export async function createSession(req, res) {
    const io = req.app.get("io");
    const { subject, date, time, duration, note = "", visibility = "private", invitedFriends = [] } = req.body;
    console.log("Creating session with invited friends:", invitedFriends);

    const startAt = new Date(`${date}T${time}`);

    // Prepare participants array - creator is automatically accepted
    const participants = [
        {
            user: req.userId,
            status: 'accepted', // Creator is automatically accepted
            invitedAt: new Date(),
            respondedAt: new Date() // Creator "responds" immediately
        }
    ];

    // Resolve friendCodes → userIds
    const invitedUsers = await User.find({ friendCode: { $in: invitedFriends } }).select("_id name");
    const invitedUserIds = invitedUsers.map(u => u._id);


    // Add invited friends with pending status
    if (invitedUserIds && invitedUserIds.length > 0) {
        invitedUserIds.forEach(friendId => {
            participants.push({
                user: friendId,
                status: 'invited', // Changed from default to 'invited'
                invitedAt: new Date()
            });
        });
    }

    const doc = await StudySession.create({
        creator: req.userId,
        subject,
        startAt: startAt,
        duration,
        note,
        visibility,
        participants,
        status: invitedUserIds.length > 0 ? 'pending' : 'scheduled', // If no invites, mark as scheduled
        messages: [] // Initialize messages array
    });

    console.log("Created session:", doc);
    console.log("----consoling from controller------");

    // Emit realtime to invited users
    if (invitedUserIds.length > 0) {
        invitedUserIds.forEach(friendId => {
            console.log(`📤 Emitting invite to user: ${friendId}`);
            const inviteData = {
                _id: doc._id, // Important: include the session ID
                from: req.userId,
                name: req.user?.name || "A friend",
                subject: doc.subject,
                startAt: doc.startAt,
                duration: doc.duration,
                note: doc.note,
                creator: req.userId,
                participants: doc.participants,
                status: doc.status
            };
            console.log(`📤 Invite data:`, inviteData);
            io.to(String(friendId)).emit("receiveInvite", inviteData);
        });
    }

    // Emit to creator so they see it immediately in their list
    io.to(String(req.userId)).emit("sessionCreated", {
        sessionId: doc._id,
        sessionDetails: doc
    });

    res.status(201).json(doc);
}

export async function getMySessions(req, res) {
    try {
        const sessions = await StudySession.find({
            $or: [
                { creator: req.userId },
                { "participants.user": req.userId },
            ],
        })
            .populate('creator', 'name email')
            .populate('participants.user', 'name email')
            .sort({ startAt: 1 });

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
}

export async function getMyInvites(req, res) {
    try {
        const invites = await StudySession.find({
            "participants.user": req.userId,
            "participants.status": "invited", // Changed from "invited" to match what we set
            status: "pending"
        })
            .populate("creator", "name email")
            .populate('participants.user', 'name email');

        // Format for frontend compatibility
        const formattedInvites = invites.map(session => ({
            ...session.toObject(),
            from: session.creator._id,
            name: session.creator.name
        }));

        res.json(formattedInvites);
    } catch (err) {
        console.error('Error fetching invites:', err);
        res.status(500).json({ error: "Failed to fetch invites" });
    }
}

export async function respondInvite(req, res) {
    const io = req.app.get("io");
    const { id } = req.params;                    // session id
    const { action } = req.body;                  // 'accept' | 'decline'

    try {
        const newStatus = action === "accept" ? "accepted" : "declined";

        const session = await StudySession.findOneAndUpdate(
            { _id: id, "participants.user": req.userId },
            {
                $set: {
                    "participants.$.status": newStatus,
                    "participants.$.respondedAt": new Date()
                }
            },
            { new: true }
        ).populate('creator', 'name email').populate('participants.user', 'name email');

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // If accepted, check if we should mark session as scheduled
        if (action === "accept") {
            // Check if all participants have responded
            const allResponded = session.participants.every(p =>
                p.status === "accepted" || p.status === "declined"
            );

            // If at least one accepted (including creator who's auto-accepted), mark as scheduled
            const hasAccepted = session.participants.some(p => p.status === "accepted");

            if (hasAccepted && session.status === "pending") {
                session.status = "scheduled";
                await session.save();
            }

            // Emit to all participants that session is ready
            const participantIds = session.participants
                .filter(p => p.status === "accepted")
                .map(p => String(p.user._id || p.user));

            participantIds.forEach(uid => {
                io.to(uid).emit('sessionScheduled', {
                    sessionId: session._id,
                    roomId: `session_${session._id}`,
                    sessionDetails: session,
                    message: 'Session is scheduled! You can now join.'
                });
            });

            // Notify creator specifically about acceptance
            io.to(String(session.creator._id || session.creator)).emit("inviteAccepted", {
                by: String(req.userId),
                name: req.user?.name || "Someone",
                sessionDetails: session,
                sessionId: session._id,
                roomId: `session_${session._id}`
            });
        } else {
            // Notify creator about decline
            io.to(String(session.creator._id || session.creator)).emit("inviteDeclined", {
                by: String(req.userId),
                name: req.user?.name || "Someone",
                sessionId: session._id,
                sessionDetails: session
            });
        }

        // Update the responder's own session list
        io.to(String(req.userId)).emit("session:updated", session);

        res.json({ ok: true, session });
    } catch (error) {
        console.error('Error responding to invite:', error);
        res.status(500).json({ error: 'Failed to respond to invite' });
    }
}

export async function cancelSession(req, res) {
    const io = req.app.get("io");
    const { id } = req.params;

    try {
        const session = await StudySession.findOneAndUpdate(
            { _id: id, creator: req.userId },
            { $set: { status: "cancelled" } },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ message: "Session not found or not authorized" });
        }

        // Notify all participants
        const notifyUsers = [
            String(session.creator),
            ...session.participants.map(p => String(p.user))
        ];

        notifyUsers.forEach(uid => {
            io.to(uid).emit("session:cancelled", {
                sessionId: id,
                sessionDetails: session
            });
        });

        res.json({ ok: true, session });
    } catch (error) {
        console.error('Error cancelling session:', error);
        res.status(500).json({ error: 'Failed to cancel session' });
    }
}

// Additional helper function for joining sessions (if you want to handle it via API too)
export async function joinSession(req, res) {
    const io = req.app.get("io");
    const { id } = req.params;

    try {
        // Verify user is accepted participant
        const session = await StudySession.findOne({
            _id: id,
            "participants.user": req.userId,
            "participants.status": "accepted"
        }).populate('participants.user', 'name email');

        if (!session) {
            return res.status(404).json({
                message: "Session not found or you're not authorized to join"
            });
        }

        if (session.status !== 'scheduled' && session.status !== 'in_progress') {
            return res.status(400).json({
                message: "Session is not available for joining"
            });
        }

        // Update session status to in_progress if it's the first person joining
        if (session.status === 'scheduled') {
            session.status = 'in_progress';
            session.actualStartTime = new Date();
            await session.save();
        }

        // Emit to all participants that session has started
        const participantIds = session.participants
            .filter(p => p.status === "accepted")
            .map(p => String(p.user._id || p.user));

        participantIds.forEach(uid => {
            io.to(uid).emit('sessionStarted', {
                sessionId: session._id,
                sessionDetails: session,
                message: 'Study session is now live!'
            });
        });

        res.json({
            ok: true,
            session,
            message: 'Successfully joined session'
        });
    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ error: 'Failed to join session' });
    }
}