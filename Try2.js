// 文件名: login.js (后台运行并执行查询)

const puppeteer = require('puppeteer');

// --- User Credentials (use environment variables for security) ---
const UserNameVar = process.env.ECUST_USERNAME || 'YOUR_USERNAME_HERE';
const UserPassVar = process.env.ECUST_PASSWORD || 'YOUR_PASSWORD_HERE';

// --- Electricity Query Details ---
const buildingNumber = 'YOUR_BUILDING_NUMBER'; // e.g., '18'
const floorValue = 'YOUR_FLOOR_VALUE';     // e.g., '6'
const roomNumber = 'YOUR_ROOM_NUMBER';      // e.g., '601'


async function runAutomation() {
    console.log('🚀 Launching headless browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        // --- Login Section (same as before) ---
        console.log('Navigating to login page...');
        await page.goto('http://ykt.ecust.edu.cn/epay/', { waitUntil: 'networkidle2' });

        console.log('Entering credentials...');
        await page.waitForSelector('#username');
        await page.type('#username', UserNameVar);
        await page.type('#password', UserPassVar);

        console.log('Clicking login button...');
        await page.click('#login_button');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log(`✅ Login successful! Landed on: ${page.url()}`);

        // =================================================================
        // ### BEGIN: New code for electricity query ###
        // =================================================================

        console.log('🔍 Starting electricity query steps...');

        // We use page.evaluate to run a block of JavaScript directly on the page.
        // We can pass our Node.js variables (buildingNumber, etc.) into this function.
        const remainElec = await page.evaluate(async (building, floor, room) => {
            // This entire async function runs inside the browser, not in Node.js

            // Helper function to create a delay inside the browser
            const delay = (ms) => new Promise(res => setTimeout(res, ms));

            // Helper function to set a value and trigger the 'change' event
            const setAndDispatch = (elementId, value) => {
                const element = document.getElementById(elementId);
                if (!element) throw new Error(`Element with id "${elementId}" not found on page.`);
                element.value = value;
                element.dispatchEvent(new Event('change', { 'bubbles': true }));
            };

            // --- Execute your sequence with 1-second intervals ---

            console.log('Setting area...');
            setAndDispatch('elcarea', '2');
            await delay(1000);

            console.log('Setting district...');
            setAndDispatch('elcdistrict', '1');
            await delay(1000);

            console.log('Setting building...');
            setAndDispatch('elcbuis', '4');
            await delay(1000);

            console.log('Setting floor...');
            setAndDispatch('elcfloor', '116');
            await delay(1000);

            console.log('Setting room...');
            setAndDispatch('elcroom', '204');
            await delay(1000);

            console.log('Clicking query button...');
            const queryButton = document.getElementById('queryBill');
            if (!queryButton) throw new Error('Query button #queryBill not found.');
            queryButton.click();

            // After clicking, we need to wait for the result to be calculated and displayed.
            // A fixed delay is unreliable. It's better to poll until the value appears.
            await new Promise((resolve, reject) => {
                let attempts = 0;
                const interval = setInterval(() => {
                    const resultElement = document.getElementById('dumpEnergy');
                    // Check if the element exists and has a non-empty value
                    if (resultElement && resultElement.value) {
                        clearInterval(interval);
                        resolve();
                    } else if (attempts > 20) { // Timeout after 10 seconds
                        clearInterval(interval);
                        reject(new Error('Timeout: #dumpEnergy value did not appear.'));
                    }
                    attempts++;
                }, 500);
            });

            // Finally, get the value and return it back to our Node.js script
            return document.getElementById('dumpEnergy').value;

        }, buildingNumber, floorValue, roomNumber); // Pass Node.js variables into the evaluate function

        console.log('-------------------------------------------');
        console.log(`💡 Query complete! Remaining Electricity: ${remainElec}`);
        console.log('-------------------------------------------');

        // =================================================================
        // ### END: New code for electricity query ###
        // =================================================================

    } catch (error) {
        console.error('❌ An error occurred during automation:', error);
        await page.screenshot({ path: 'error.png' });
        console.log('An error screenshot has been saved to error.png');
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

runAutomation();