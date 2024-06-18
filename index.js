import axios from 'axios';
import fs from 'fs';
import chalk from 'chalk'
import { failMessage, infoMessage, successMessage } from './chalk.js';

const hourglassFrames = [
  '⏳',
  '⌛',
  '⌛',
  '⏳'
];
const getUserInfo = async (header) => {
  try {
    const { data } = await axios.get(
      'https://api-pass.levelinfinite.com/api/ugc/user/get_info',
      {
        headers: {
          ...header,
        },
      }
    );
    return data.data;
  } catch (error) {
    throw error;
  }
};

const getTask = async (header) => {
  try {
    const { data } = await axios.get(
      'https://api-pass.levelinfinite.com/api/rewards/proxy/lipass/Points/GetTaskListWithStatus',
      {
        params: {
          language: 'en',
        },
        headers: {
          ...header,
        },
      }
    );
    return data.data;
  } catch (error) {
    throw error;
  }
};

const checkLogin = async (header) => {
  try {
    const { data } = await axios.get(
      'https://api-pass.levelinfinite.com/api/ugc/user/check_login',
      {
        headers: {
          ...header,
        },
      }
    );
    if (data) {
      successMessage('Valid cookie detected');
    }
  } catch (error) {
    failMessage('Oops, failed to check cookie');
    throw error;
  }
};

const reqDailyCheckin = async (header) => {
  try {
    const { data } = await axios.post(
      'https://api-pass.levelinfinite.com/api/rewards/proxy/lipass/Points/DailyCheckIn',
      {
        task_id: '15',
      },
      {
        headers: {
          ...header,
        },
      }
    );
    if (data) {
      successMessage(`Success! Received 100 points`);
    }
  } catch (error) {
    throw error;
  }
};

const calculateDelay = (lastCheckinTime) => {
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const delay = lastCheckinTime + twentyFourHoursInMs - now;
  return delay > 0 ? delay : 0;
};

const displayCooldown = async (delay) => {
  let elapsed = 0;
  const interval = 1000; 
  let frameIndex = 0;

  return new Promise((resolve) => {
    const intervalId = setInterval(() => {
      elapsed += interval;
      const remainingTime = delay - elapsed;

      const hours = Math.floor(remainingTime / (1000 * 60 * 60));
      const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
      process.stdout.write('\r');
      process.stdout.write(hourglassFrames[frameIndex]);
      const timeRemainingText = chalk.rgb(13,152,186)(` Next check-in at: ${hours}h ${minutes}m ${seconds}s`);
      process.stdout.write(timeRemainingText);

      frameIndex = (frameIndex + 1) % hourglassFrames.length;

      if (remainingTime <= 0) {
        clearInterval(intervalId);
        resolve();
      }
    }, interval);
  });
};


const processCheckin = async (header, lastCheckinTime) => {
  const delay = calculateDelay(lastCheckinTime);

  if (delay > 0) {
    infoMessage(`Next check-in will be in ${Math.round(delay / 3600000)} hours.`);
    await displayCooldown(delay);
  }

  setTimeout(async () => {
    try {
      const userInfo = await getUserInfo(header);
      successMessage(`Logged in as ${userInfo.username}`);

      const rewardInfo = await getTask(header);
      if (rewardInfo.tasks[0].is_completed === true) {
        failMessage(`Username ${userInfo.username} already checked in. Wait for tommorow.`);
      } else {
        infoMessage(`Username ${userInfo.username} is doing daily check-in`);
        await reqDailyCheckin(header);
        infoMessage(`Check-in completed for ${userInfo.username}, scheduling next check-in.`);
      }

      processCheckin(header, Date.now());
    } catch (error) {
      console.log(error);
    }
  }, delay);
};

(async () => {
  try {
    console.log(`Level Infinite Daily Check-in \nMade with ❤️  | by janexmgd dikocokin im-hanzou`);

    const listCookie = fs
      .readFileSync('cookie.txt', 'utf-8')
      .replace(/\r/g, '')
      .split('\n');

    for (const cookie of listCookie) {
      const headers = {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.7',
        'cache-control': 'no-cache',
        cookie: cookie,
        origin: 'https://pass.levelinfinite.com',
        pragma: 'no-cache',
        priority: 'u=1, i',
        referer: 'https://pass.levelinfinite.com/',
        'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'sec-gpc': '1',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'x-common-params':
          '{"game_id":"4","area_id":"global","source":"pc_web"}',
      };

      await checkLogin(headers);
      const userInfo = await getUserInfo(headers);
      successMessage(`Starting check-in process for ${userInfo.username}`);
      processCheckin(headers, 0);
    }

    infoMessage(`${listCookie.length} account(s) processed`);
  } catch (error) {
    console.log(error);
  }
})();
