const admin = require( 'firebase-admin' );
const faker = require( 'faker' );
const serviceAccount = require( './service-accountKey.json' );

admin.initializeApp( {
    credential : admin.credential.cert( serviceAccount ),
    databaseURL: 'https://yaml-snippets.firebaseio.com'
} );
const db = admin.firestore();

const fakeIt = () => {
    return db.collection( 'snippets' ).add( {
        name       : faker.random.word(),
        description: faker.lorem.paragraph(),
        content    : faker.lorem.paragraph(),
        author     : {
            displayName: faker.internet.userName(),
            uid        : faker.random.uuid()
        }
    } ).catch( ( e ) => console.log( e ) );
};

Array( 100 ).fill( 0 ).forEach( fakeIt );
