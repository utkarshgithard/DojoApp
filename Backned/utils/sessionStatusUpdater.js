import cron from "node-cron";
import StudySession from "../models/StudySession.js";
import { io } from "../Server.js";
cron.schedule("* * * * *", async () => {
    const now = new Date();

    // Update scheduled → in_progress
    const startingSessions = await StudySession.find({
        status: "scheduled",
        startAt: { $lte: now }
    });


    for (let session of startingSessions) {
        session.status = "in_progress";
        await session.save();

        // Notify participants

        io.emit("sessionStarted", {
            sessionId: session._id,
            sessionDetails: session,
        });
    }

    // Update in_progress → expired
    const inProgressSessions = await StudySession.find({ status: "in_progress" });

    for (let session of inProgressSessions) {
        const endTime = new Date(session.startAt).getTime() + session.duration * 60000;
        if (now.getTime() >= endTime) {
            session.status = "completed";
            await session.save();

            io.emit("sessionExpired", {
                sessionId: session._id,
                sessionDetails: session,
            });
        }
    }

});
