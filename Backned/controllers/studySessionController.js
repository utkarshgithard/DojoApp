import StudySession from "../models/StudySession.js";

export async function createSession(req, res) {
    const io = req.app.get("io");
    const { subject, date, time, duration, note = "", visibility = "private", invitedFriends = [] } = req.body;
    console.log(invitedFriends)
    
    const startAt = new Date(`${date}T${time}`);
    const doc = await StudySession.create({
        creator: req.userId,
        subject,
        startAt: startAt,
        duration,
        note,
        visibility,
        participants: invitedFriends.map(id => ({ user: id })),
    });

    console.log("----consoling from controller------")

    // Emit realtime to invited users
    invitedFriends.forEach(friendId => {
        console.log(`📤 Emitting to user: ${friendId}`);
        const inviteData = {
            from: req.userId,
            name: req.user?.name || "A friend",
            sessionDetails: {
                topic: subject,
                time: time,
                date: date,
                duration: duration,
                note: note
            }
        };
        console.log(`📤 Invite data:`, inviteData);
        io.to(String(friendId)).emit("receiveInvite", inviteData);
    });
    // Also emit to creator so they see it immediately in their list
    io.to(String(req.userId)).emit("session:created", doc);

    res.status(201).json(doc);
}

export async function getMySessions(req, res) {
    const sessions = await StudySession.find({
        $or: [{ creator: req.userId },
            { "participants.user":req.userId },
        ],
    }).sort({ startAt: 1 });
    res.json(sessions);
}

export async function getMyInvites(req, res) {
    try {
    const invites = await StudySession.find({
      "participants.user": req.user._id,
      "participants.status": "invited",
      status: "pending"
    }).populate("creator", "name email");

    res.json(invites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch invites" });
  }
}

export async function respondInvite(req, res) {
    const io = req.app.get("io");
    const { id } = req.params;                    // session id
    const { action } = req.body;                  // 'accept' | 'decline'
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
    );
    if (!session) return res.status(404).json({ message: "Session not found" });

    // Notify creator
    io.to(String(session.creator)).emit("invite:updated", {
        sessionId: session._id,
        userId: req.userId,
        status: newStatus
    });
    // Update the responder's own session list
    io.to(String(req.userId)).emit("session:updated", session);

    res.json({ ok: true, session });
}

export async function cancelSession(req, res) {
    const io = req.app.get("io");
    const { id } = req.params;

    const session = await StudySession.findOneAndUpdate(
        { _id: id, creator: req.userId },
        { $set: { status: "cancelled" } },
        { new: true }
    );
    if (!session) return res.status(404).json({ message: "Not found" });

    const notifyUsers = [
        String(session.creator),
        ...session.participants.map(p => String(p.user))
    ];
    notifyUsers.forEach(uid => io.to(uid).emit("session:cancelled", { sessionId: id }));

    res.json({ ok: true });
}
