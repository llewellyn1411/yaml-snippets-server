import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import algoliasearch from 'algoliasearch';
import { db } from './firebase-local';

const ALGOLIA_APP_ID = functions.config().algolia.app;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.key;
const client = algoliasearch( ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY );
const index = client.initIndex( 'snippets' );

export const createUser = functions.auth.user().onCreate( ( user ) => {
    const { email, displayName, uid } = user;

    return db.collection( 'users' ).doc( uid ).set( {
        email,
        displayName,
        favourites: [],
        countStar: 0,
        snippetCount: 0
    } );
} );

export const createSnippet = functions.firestore.document( 'snippets/{snippetId}' ).onCreate( async ( snapshot ) => {
    const data = snapshot.data();
    const id = snapshot.id;

    const initData = snapshot.ref.set( {
        countCopy: 0,
        countStar: 0
    }, { merge: true } );

    // Add to the algolia index
    const addToIndex = index.addObject( {
        objectID: id,
        author: {
            displayName: data.author.displayName,
            uid: data.author.uid,
        },
        name: data.name,
        description: data.description,
        countCopy: 0,
        countStar: 0
    } );

    await Promise.all( [ initData, addToIndex ] );
} );

export const updateSnippet = functions.firestore.document( 'snippets/{snippetId}' ).onUpdate( ( change ) => {
    const data = change.after.data();
    const id = change.after.id;

    // TODO: Only update if name/description or content has changed

    // Update the algolia object
    return index.saveObject( {
        objectID: id,
        author: {
            displayName: data.author.displayName,
            uid: data.author.uid
        },
        name: data.name,
        description: data.description,
        countCopy: data.countCopy,
        countStar: data.countStar
    } );
} );

export const deleteSnippet = functions.firestore.document( 'snippets/{snippetId}' ).onDelete( ( snapshot ) => {
    // Delete the algolia object
    return index.deleteObject( snapshot.id );
} );

export const addStar = functions.firestore.document( 'stars/{starId}' ).onCreate( ( snapshot ) => {
    const data = snapshot.data();

    return db.collection( 'snippets' ).doc( data.snippetId ).update( {
        countStar: admin.firestore.FieldValue.increment( 1 )
    } );
} );

export const removeStar = functions.firestore.document( 'stars/{starId}' ).onDelete( ( snapshot ) => {
    const data = snapshot.data();

    return db.collection( 'snippets' ).doc( data.snippetId ).update( {
        countStar: admin.firestore.FieldValue.increment( -1 )
    } );
} );