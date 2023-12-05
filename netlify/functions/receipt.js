import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';


chromium.setHeadlessMode = true
chromium.setGraphicsMode = false

export async function handler(event, context) {
  const url = event.queryStringParameters.url
  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath('/var/task/node_modules/@sparticuz/chromium/bin')),
    })

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle0',
    });

    const cleanUrl = decodeURIComponent(url).replace(/<>/g, '&').replace(/##/g, '?');
    const urlParams = new URLSearchParams(cleanUrl);
    const paymentDate = urlParams.get('paymentDate');
    const referenceNo = urlParams.get('referenceNo');
    const paymentMode = urlParams.get('paymentMode');
    const description = urlParams.get('description');
    const receivedFrom = urlParams.get('receivedFrom');
    const amount = urlParams.get('amount');

    const receiptData = {
      paymentDate,
      referenceNo,
      paymentMode,
      description,
      receivedFrom,
      amount,
      url,
    };

    await page.evaluate((data) => {
      document.getElementById('payment-date').innerHTML = `${data.paymentDate}`;
      document.getElementById('reference-no').innerHTML = `${data.referenceNo}`;
      document.getElementById('payment-mode').innerHTML = `${data.paymentMode}`;
      document.getElementById('description').innerHTML = `${data.description}`;
      document.getElementById('received-from').innerHTML = `${data.receivedFrom}`;
      document.getElementById('amount').innerHTML = `${data.amount}`;

    }, receiptData);

    await page.emulateMediaType('screen');

    const pdf = await page.pdf({
      format: 'a4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '40px',
        left: '20px',
        right: '20px',
      },
      pageRanges: '1',
    });

    await browser.close()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Receipt-${referenceNo}-${new Date().toISOString()}.pdf`,
      },
      body: pdf.toString('base64'),
      isBase64Encoded: true,
    }
  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    }
  }
}
