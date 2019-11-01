import * as admin from 'firebase-admin'

admin.initializeApp()

export { createUser, createSnippet, updateSnippet, deleteSnippet, addStar, removeStar } from './triggers';

// TODO: special characters