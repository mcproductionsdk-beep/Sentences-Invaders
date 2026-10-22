const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',e=>errors.push(e.message));
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const files={'/':'index.html','/content/sentences.v1.json':'content/sentences.v1.json'};
 const file=files[pathname];
 if(!file){res.writeHead(404);return res.end('Not found')}
 res.setHeader('Content-Type',file.endsWith('.json')?'application/json':'text/html');
 fs.createReadStream(path.resolve(file)).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
await page.route('https://boringteacher.com/libraries/sentences/v1.json',route=>route.fulfill({status:200,contentType:'application/json',body:fs.readFileSync('content/sentences.v1.json','utf8')}));
const url='http://127.0.0.1:'+server.address().port+'/';
await page.goto(url);
await page.waitForFunction(()=>document.querySelector('#menuMsg').textContent.includes('Shared grammar library loaded'));
const library=JSON.parse(fs.readFileSync('content/sentences.v1.json','utf8'));
for(const locale of Object.keys(library.languages)){
 await page.locator('#language').selectOption(locale);
 const expected=Object.keys(library.languages[locale]);
 const actual=await page.locator('#topic option').allTextContents();
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(locale+' topic menu differs from shared JSON');
}

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
// Student link flow: external grammar fetch must not overwrite teacher set or its status.
const student=await browser.newPage({viewport:{width:1280,height:900}});
student.on('pageerror',e=>errors.push('student: '+e.message));
await student.route('https://boringteacher.com/libraries/sentences/v1.json',route=>route.fulfill({status:200,contentType:'application/json',body:fs.readFileSync('content/sentences.v1.json','utf8')}));
await student.route('**/sentence-sets/SABCDEFGH',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,set:{title:'Teacher test',language:'de-DE',pairs:[['Ich lese Bücher','I read books'],['Wir lernen Deutsch','We learn German']]}})}));
await student.goto(url+'#set=SABCDEFGH');
await student.waitForFunction(()=>document.querySelector('#menuMsg').textContent==='Ready to play.');
if(await student.locator('#language').inputValue()!=='de-DE')throw Error('Student locale lost');
if(!(await student.locator('#custom').inputValue()).includes('I read books\\tIch lese Bücher'))throw Error('Student pairs lost');
await student.locator('#useCustom').click();
if(!(await student.locator('#gameArea').isVisible()))throw Error('Student game did not start');
await student.close();
if(errors.length)throw Error('Browser JS errors: '+errors.join('; '));
await browser.close();
await new Promise(resolve=>server.close(resolve));
})().catch(e=>{console.error(e);process.exit(1)});
