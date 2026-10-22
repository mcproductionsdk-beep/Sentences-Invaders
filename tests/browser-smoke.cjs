const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',e=>errors.push(e.message));
const url='file://'+path.resolve('index.html');
await page.goto(url);
fs.mkdirSync('browser-screenshots',{recursive:true});
for(const locale of ['es-ES','de-DE','da-DK','fr-FR','it-IT']){
 await page.locator('#language').selectOption(locale);
 const topics=await page.locator('#topic option').count();
 if(topics<10)throw Error(locale+' topics missing: '+topics);
 await page.locator('#startBuilt').click();
 await page.waitForTimeout(450);
 const visible=await page.locator('#gameArea').isVisible();
 if(!visible)throw Error(locale+' game did not start');
 const english=await page.locator('#english').innerText();
 if(!english.trim())throw Error(locale+' English prompt missing');
 const tileCount=await page.locator('#tiles').locator('*').count();
 await page.screenshot({path:'browser-screenshots/'+locale+'.png'});
 await page.keyboard.press('ArrowLeft');
 await page.keyboard.press('Space');
 await page.waitForTimeout(250);
 await page.locator('#backMenu').click();
 if(!(await page.locator('#menu').isVisible()))throw Error(locale+' menu did not return');
 console.log(locale,'topics',topics,'prompt',english,'tiles',tileCount);
}
if(errors.length)throw Error('Browser JS errors: '+errors.join('; '));
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
