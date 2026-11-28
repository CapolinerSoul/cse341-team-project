import { connectToDb, closeDb } from './src/db/connect.js';

const ids = Array.from(
    { length: 15 },
    (_, index) => `pagination-test-${String(index + 1).padStart(2, '0')}`
);

try {
    const db = await connectToDb();
    const collection = db.collection('trips');

    if (process.argv.includes('--remove')) {
        const result = await collection.deleteMany({
            id: { $in: ids }
        });

        console.log(`Removed ${result.deletedCount} test trips.`);
    } else {
        const original = await collection.findOne({
            id: 'alpine-panorama'
        });

        if (!original) {
            throw new Error('The alpine-panorama seed trip is missing.');
        }

        const { _id, ...template } = original;

        for (const [index, id] of ids.entries()) {
            await collection.updateOne(
                { id },
                {
                    $setOnInsert: {
                        ...template,
                        id,
                        name: `Pagination Test Trip ${index + 1}`,
                        description: 'Temporary trip for testing pagination.'
                    }
                },
                { upsert: true }
            );
        }

        console.log('Test trips added.');
    }
} finally {
    await closeDb();
}
