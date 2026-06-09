import mongoose from 'mongoose';

const sourceUri = 'mongodb+srv://omparteki:omparteki@cluster0.ty7pa26.mongodb.net/appzeto_taxi';
const destUri = 'mongodb+srv://yatradesk:yatradesk@yatradesk.ae08xk6.mongodb.net/appzeto_taxi?appName=yatradesk';

async function copyDatabase() {
    let sourceConn, destConn;
    try {
        console.log('Connecting to source database...');
        sourceConn = await mongoose.createConnection(sourceUri).asPromise();
        console.log('Connected to source.');

        console.log('Connecting to destination database...');
        destConn = await mongoose.createConnection(destUri).asPromise();
        console.log('Connected to destination.');

        // Get all collections from the source
        const collections = await sourceConn.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections.`);

        for (const colInfo of collections) {
            const colName = colInfo.name;
            
            // Skip system collections
            if (colName.startsWith('system.')) {
                continue;
            }

            console.log(`\nProcessing collection: ${colName}`);
            
            const sourceCollection = sourceConn.collection(colName);
            const destCollection = destConn.collection(colName);

            // Fetch all documents from the source collection
            const documents = await sourceCollection.find({}).toArray();
            console.log(`  Fetched ${documents.length} documents from source.`);

            // Delete existing data in destination collection if any
            console.log(`  Clearing destination collection...`);
            await destCollection.deleteMany({});

            if (documents.length > 0) {
                console.log(`  Inserting data into destination...`);
                // Insert documents into destination
                // Mongoose collection.insertMany doesn't exist on native collection in some versions, use db.collection directly
                const destNativeCol = destConn.db.collection(colName);
                await destNativeCol.insertMany(documents);
                console.log(`  Successfully inserted ${documents.length} documents.`);
            } else {
                console.log(`  No data to insert.`);
            }
        }

        console.log('\n--- Database copy completed successfully! ---');

    } catch (error) {
        console.error('Error during database copy:', error);
    } finally {
        if (sourceConn) await sourceConn.close();
        if (destConn) await destConn.close();
    }
}

copyDatabase();
