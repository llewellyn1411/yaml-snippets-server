import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import algoliasearch from 'algoliasearch';
import { db, auth } from './firebase-local';

const ALGOLIA_APP_ID = functions.config().algolia.app;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.key;
const client = algoliasearch( ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY );
const index = client.initIndex( 'snippets' );

const deleteUserStars = ( userId: string ) => {
    return db.collection( 'stars' ).where( 'userId', '==', userId ).get()
        .then( ( querySnapshot ) => {
            const batch = db.batch();

            querySnapshot.forEach( ( snapshot ) => {
                batch.delete( snapshot.ref );
            } );

            return batch.commit();
        } );
};

const removeUserFromSnippets = ( userId: string ) => {
    return db.collection( 'snippets' ).where( 'userId', '==', userId ).get()
        .then( ( querySnapshot ) => {
            const batch = db.batch();

            querySnapshot.forEach( ( snapshot ) => {
                batch.update( snapshot.ref, { author: null } );
            } );

            return batch.commit();
        } );
};

const deleteUserAccount = ( userId: string ) => {
    return auth.deleteUser( userId )
        .then( () => {
            return db.collection( 'users' ).doc( userId ).delete();
        } );
};

const deleteAllUserData = ( userId: string ) => {
    return Promise.all( [ removeUserFromSnippets( userId ), deleteUserStars( userId ), deleteUserAccount( userId ) ] );
};

export const createUser = functions.auth.user().onCreate( ( user ) => {
    const { email, displayName, uid } = user;

    return db.collection( 'users' ).doc( uid ).set( {
        email,
        displayName,
        countStar: 0,
        snippetCount: 0,
        role: 0
    } );
} );

export const createSnippet = functions.firestore.document( 'snippets/{snippetId}' ).onCreate( async ( snapshot ) => {
    const data = snapshot.data();
    const id = snapshot.id;

    const initData = snapshot.ref.set( {
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
        countStar: 0
    } );

    await Promise.all( [ initData, addToIndex ] );
} );

export const updateSnippet = functions.firestore.document( 'snippets/{snippetId}' ).onUpdate( ( change ) => {
    const data = change.after.data();
    const id = change.after.id;

    // Update the algolia object
    return index.saveObject( {
        objectID: id,
        author: {
            displayName: data.author.displayName,
            uid: data.author.uid
        },
        name: data.name,
        description: data.description,
        countStar: data.countStar
    } );
} );

export const deleteSnippet = functions.firestore.document( 'snippets/{snippetId}' ).onDelete( ( snapshot ) => {
    // Delete the algolia object
    return Promise.all( [ index.deleteObject( snapshot.id ), deleteUserStars( snapshot.data().snippetId ) ] );
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

export const deleteUser = functions.https.onCall( ( data, context ) => {
    const uid = context.auth.uid;

    return deleteAllUserData( uid );
} );