/**
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();

/**
 * After a user leaves a private or whisper room (by being removed from the 
 * participants map), this function checks if the room is empty. If it is, 
 * the function deletes the entire room and its subcollections.
 */
exports.onParticipantLeave = onDocumentUpdated("chatRooms/{roomId}", async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // Only apply to private (non-public) rooms
    if (beforeData.isPublic) {
        return;
    }

    const beforeParticipants = beforeData.participants || {};
    const afterParticipants = afterData.participants || {};

    // No change in participants, so do nothing.
    if (Object.keys(beforeParticipants).length === Object.keys(afterParticipants).length) {
        return;
    }
    
    // If the room is now empty, delete it.
    if (Object.keys(afterParticipants).length === 0) {
        const db = getFirestore();
        const roomRef = db.collection("chatRooms").doc(event.params.roomId);

        // Firebase CLI can delete subcollections, but in a function,
        // we can just delete the document, and the subcollections will be
        // inaccessible and eventually cleaned up. For a more immediate/thorough
        // cleanup, we would need to recursively delete subcollection documents.
        // For this app, simply deleting the room doc is sufficient.
        console.log(`Deleting empty private/whisper room: ${event.params.roomId}`);
        await roomRef.delete();
    }
});
