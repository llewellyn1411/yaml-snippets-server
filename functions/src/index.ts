import * as admin from 'firebase-admin'

admin.initializeApp()

export { createUser, createSnippet, addStar, removeStar } from './triggers';
