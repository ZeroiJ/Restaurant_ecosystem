import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import path from 'path';

export async function GET(request) {
  try {
    // 1. Fetch current inventory and past orders
    const inventory = await db.inventoryItem.findMany();
    const orders = await db.order.findMany();

    // 2. Prepare payload for the Python script
    const payload = {
      inventory,
      orders
    };

    // Path to the python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'xgboost_forecast.py');

    // Run the Python script and stream payload via stdin
    const runPredictor = () => {
      return new Promise((resolve, reject) => {
        const child = exec(`python "${scriptPath}"`, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
            return;
          }
          try {
            const predictions = JSON.parse(stdout);
            resolve(predictions);
          } catch (e) {
            reject(new Error(`Failed to parse prediction output: ${stdout}`));
          }
        });

        // Write the payload to the stdin of the python process
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
      });
    };

    const predictions = await runPredictor();

    return NextResponse.json(predictions);
  } catch (error) {
    console.error('XGBoost forecasting route error:', error);
    return NextResponse.json({ 
      error: 'Failed to run XGBoost predictions', 
      details: error.message 
    }, { status: 500 });
  }
}
