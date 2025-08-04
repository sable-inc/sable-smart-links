import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const setupDatabase = async () => {
  try {
    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('sable-smart-links');

    // Create keys collection
    const keysCollection = db.collection('keys');

    // Create indexes for better performance
    await keysCollection.createIndex({ clientKey: 1 }, { unique: true });
    await keysCollection.createIndex({ 'internalKeys.keyType': 1 });
    await keysCollection.createIndex({ active: 1 });

    // Sample data - replace with your actual keys
    const sampleKeys = [
      {
        clientKey: 'sable_demo_key_123',
        internalKeys: [
          {
            keyType: 'bedrock',
            internalKey: 'AKIAIOSFODNN7EXAMPLE', // Replace with actual Bedrock key
            permissions: ['read', 'write'],
            active: true,
            createdAt: new Date(),
            lastUsed: null,
            usageCount: 0
          }
        ],
        active: true,
        createdAt: new Date(),
        lastUsed: null,
        usageCount: 0
      },
      {
        clientKey: 'sable_prod_key_456',
        internalKeys: [
          {
            keyType: 'bedrock',
            internalKey: 'AKIAIOSFODNN7EXAMPLE2', // Replace with actual Bedrock key
            permissions: ['read', 'write'],
            active: true,
            createdAt: new Date(),
            lastUsed: null,
            usageCount: 0
          },
          {
            keyType: 'openai',
            internalKey: 'sk-1234567890abcdef', // Replace with actual OpenAI key
            permissions: ['read'],
            active: true,
            createdAt: new Date(),
            lastUsed: null,
            usageCount: 0
          }
        ],
        active: true,
        createdAt: new Date(),
        lastUsed: null,
        usageCount: 0
      }
    ];

    // Insert sample data
    for (const key of sampleKeys) {
      await keysCollection.updateOne(
        { clientKey: key.clientKey },
        { $setOnInsert: key },
        { upsert: true }
      );
    }

    console.log('Database setup completed successfully');
    console.log('Sample keys created:');
    console.log('- sable_demo_key_123 (Bedrock only)');
    console.log('- sable_prod_key_456 (Bedrock + OpenAI)');

    await client.close();
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
};

setupDatabase(); 