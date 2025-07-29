require('dotenv').config();
const puppeteer = require('puppeteer');
// const nodemailer = require('nodemailer');
// const cron = require('node-cron');

const UserNameVar = process.env.studentID;
const UserPassVar = process.env.ssoPassword;
const delay = (ms) => new Promise(res => setTimeout(res, ms));
async function runAutomation() {
    // 以下为查询电费的脚本

    const browser = await puppeteer.launch({ headless: 'new' }); // 在后台运行
    const page = await browser.newPage();

    try {
        console.log('导航到初始URL: http://ykt.ecust.edu.cn/epay/');
        await page.goto('http://ykt.ecust.edu.cn/epay/', { waitUntil: 'networkidle0' });

        const finalUrl = page.url();
        console.log(`页面加载完成, 当前URL为: ${finalUrl}`);

        // === 开始执行您的逻辑判断 ===

        if (finalUrl.startsWith('https://sso.ecust.edu.cn')) {
            console.log('检测到页面已重定向至 SSO 登录页，执行登录操作...');

            await page.waitForSelector('#username');
            console.log('输入用户名...');
            await page.type('#username', UserNameVar);

            console.log('输入密码...');
            await page.type('#password', UserPassVar);

            const buttonSelector = 'button[type="submit"].auth_login_btn';
            await page.click(buttonSelector);
            console.log('按钮已成功点击！');
            await delay(5000);
            await page.goto('https://ykt.ecust.edu.cn/epay/electric/load4electricindex');
            await page.click("li ::-p-text(华理电控)");
            console.log('已进入电费查询...');

        } else if (finalUrl.startsWith('http://ykt.ecust.edu.cn')) {
           // console.log('检测到页面在 YKT 官网，直接执行点击操作...');
           // console.log('点击第一个 <li> 元素...');

           // await page.click('li.app_ico');
        } else {
            console.log('页面跳转到了一个未知的URL，脚本结束。');
        }

        console.log('开始查询...');

        const remainElec = await page.evaluate(async (area,district,building, floor, room) => {

            const setAndDispatch = (elementId, value) => {
                const element = document.getElementById(elementId);
                if (!element) throw new Error(`Element with id "${elementId}" not found on page.`);
                element.value = value;
                element.dispatchEvent(new Event('change', { 'bubbles': true }));
            };

            const delay = ms => new Promise(res => setTimeout(res, ms));
            console.log('Setting area...');
            setAndDispatch('elcarea', area);
            await delay(1000);

            console.log('Setting district...');
            setAndDispatch('elcdistrict', district);
            await delay(1000);

            console.log('Setting building...');
            setAndDispatch('elcbuis', building);
            await delay(1000);

            console.log('Setting floor...');
            setAndDispatch('elcfloor', floor);
            await delay(1000);

            console.log('Setting room...');
            setAndDispatch('elcroom', room);
            await delay(1000);

            console.log('Clicking query button...');
            const queryButton = document.getElementById('queryBill');
            if (!queryButton) throw new Error('Query button #queryBill not found.');
            queryButton.click();


            await new Promise((resolve, reject) => {
                let attempts = 0;
                const interval = setInterval(() => {
                    const resultElement = document.getElementById('dumpEnergy');
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

            return document.getElementById('dumpEnergy').value;

        }, process.env.area, process.env.district, process.env.building, process.env.floor, process.env.room); // Pass Node.js variables into the evaluate function

        console.log('-------------------------------------------');
        console.log(`剩余电量: ${remainElec}`);
        console.log('-------------------------------------------');

    } catch (error) {
        console.error('自动化过程中出错:', error);
        await page.screenshot({ path: 'error.png' });
    } finally {
        await browser.close();
    }
    // 以下为自动发送邮件的脚本

}

runAutomation();