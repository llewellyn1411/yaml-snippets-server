import * as admin from 'firebase-admin'

admin.initializeApp()

export { createUser, createSnippet, updateSnippet, deleteSnippet, addStar, removeStar } from './triggers';


// TODO: Firebase Events
// TODO: Firebase analytics
// TODO: Offline firestore
// TODO: User deletion
// TODO: special characters