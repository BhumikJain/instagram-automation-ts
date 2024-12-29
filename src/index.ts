// src/index.ts
import { IgApiClient } from 'instagram-private-api';
import * as schedule from 'node-schedule';  // Changed this line
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as winston from 'winston';

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: join(__dirname, '../logs/error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: join(__dirname, '../logs/combined.log')
        })
    ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Instagram client setup
const ig = new IgApiClient();

// Configuration interface
interface PostConfig {
    imagePath: string;
    caption: string;
}

async function login(): Promise<void> {
    try {
        if (!process.env.IG_USERNAME || !process.env.IG_PASSWORD) {
            throw new Error('Instagram credentials not found in environment variables');
        }

        ig.state.generateDevice(process.env.IG_USERNAME);
        await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
        logger.info('Successfully logged in to Instagram');
    } catch (error) {
        logger.error('Login failed:', error);
        throw error;
    }
}

async function createPost(config: PostConfig): Promise<void> {
    try {
        const { imagePath, caption } = config;
        const imageBuffer = readFileSync(join(__dirname, imagePath));

        const publishResult = await ig.publish.photo({
            file: imageBuffer,
            caption: caption
        });

        logger.info(`Post created successfully. Post ID: ${publishResult.media.id}`);
    } catch (error) {
        logger.error('Failed to create post:', error);
        throw error;
    }
}

async function schedulePost(time: string, config: PostConfig): Promise<void> {
    schedule.scheduleJob(time, async () => {  // Modified this line
        try {
            // await login(); // Re-login before each post to ensure session is valid
            await createPost(config);
        } catch (error) {
            logger.error(`Scheduled post at ${time} failed:`, error);
        }
    });
    logger.info(`Post scheduled for ${time}`);
}

async function initializeScheduler(): Promise<void> {
    try {
        // Test login at startup
        await login();

        // Schedule posts for different times
        // At 12 AM
        schedulePost('*/5 * * * *', {
            imagePath: 'posts/test.jpg',
            caption: '🌙 Good night everyone! #nighttime #peaceful'
        });

        // At 6 AM
        schedulePost('0 6 * * *', {
            imagePath: 'posts/test.jpg',
            caption: '🌅 Rise and shine! #goodmorning #sunrise'
        });

        // At 6 PM
        schedulePost('0 18 * * *', {
            imagePath: 'posts/test.jpg',
            caption: '🌆 Evening vibes! #evening #sunset'
        });

        logger.info('All posts scheduled successfully');
    } catch (error) {
        logger.error('Failed to initialize scheduler:', error);
        process.exit(1);
    }
}

// Start the scheduler
initializeScheduler().catch(error => {
    logger.error('Application failed to start:', error);
    process.exit(1);
});

// import { IgApiClient } from 'instagram-private-api';
// import * as dotenv from 'dotenv';
// import { readFileSync } from 'fs';
// import { join } from 'path';

// // Load environment variables
// dotenv.config();

// async function postToInstagram() {
//     try {
//         // Check if credentials exist
//         if (!process.env.IG_USERNAME || !process.env.IG_PASSWORD) {
//             throw new Error('Please set IG_USERNAME and IG_PASSWORD in your .env file');
//         }

//         // Create Instagram client
//         const ig = new IgApiClient();
//         ig.state.generateDevice(process.env.IG_USERNAME);

//         // Login
//         console.log('Attempting to login...');
//         await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
//         console.log('Login successful!');

//         // Read the image file
//         const imagePath = join(__dirname, 'posts/test.jpg');
//         const imageBuffer = readFileSync(imagePath);

//         // Post the image
//         console.log('Uploading image...');
//         const publishResult = await ig.publish.photo({
//             file: imageBuffer,
//             caption: '🌟 Testing my Instagram automation! #test #automation'
//         });

//         console.log('Post successful!');
//         console.log(`Post ID: ${publishResult.media.id}`);

//     } catch (error) {
//         console.error('An error occurred:', error);
//     }
// }

// // Run the post function
// postToInstagram();