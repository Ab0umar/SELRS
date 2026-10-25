import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium,expect as baseExpect} from "@playwright/test";
const expect=baseExpect.configure({timeout:30000});
const directory="outputs/ai-recovery-ui";await mkdir(directory,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const results=[];
try {
  for(const theme of ["light","dark"]) for(const width of [360,768,1440]) {
    const context=await browser.newContext({viewport:{width,height:1000}});
    await context.addInitScript(theme=>localStorage.setItem("theme",theme),theme);
    const page=await context.newPage();const errors=[];const mutations=[];
    page.on("pageerror",error=>errors.push(error.message));
    const jobs=["attach","image_retry","blocked"].map((action,index)=>({id:`00000000-0000-4000-8000-00000000000${index+1}`,topic:`اختبار واجهة الاسترجاع ${action}`,pageRole:"center",state:"uncertain",postId:null,errorCode:null,createdAt:new Date().toISOString(),kind:"post",sourcePostId:null}));
    await page.route("**/api/**",async route=>{
      const request=route.request(),url=new URL(request.url());
      if(request.method()!=="GET") mutations.push(request.url());
      const methods=url.pathname.split("/api/trpc/")[1]?.split(",")||[];
      const inputs=JSON.parse(url.searchParams.get("input")||"{}");
      const responses=methods.map((method,index)=>{
        const input=inputs[index]?.json??inputs.json;
        let value=[];
        if(method==="auth.me") value={id:999999,role:"admin",name:"اختبار معزول"};
        if(method==="aiManagement.status") value={enabled:true,marketingDraftAvailable:true,marketingRecoveryAvailable:true,credentials:{}};
        if(method==="marketing.getSettings") value={autoPublish:false,saturdayEnabled:true,tuesdayEnabled:true,thursdayEnabled:true,publishHour:9,fbConnected:false};
        if(method==="marketing.dashboardSummary") value={counts:{draft:0,publishing:0,published:0,failed:0,scheduled:0,total:0},recentPosts:[]};
        if(method==="marketing.getSchedulerStatus") value={autoPublish:false,pages:[]};
        if(method==="marketing.centralGenerationJobs") value=jobs;
        if(method==="marketing.centralRecoveryPlan") {const jobIndex=jobs.findIndex(job=>job.id===input.jobId);value={action:["attach","image_retry","blocked"][jobIndex],reason:jobIndex===2?"provider_uncertain":"saved_image_available",usageReview:false,imageUsageId:"00000000-0000-4000-8000-000000000009"};}
        return {result:{data:{json:value}}};
      });
      await route.fulfill({contentType:"application/json",body:JSON.stringify(url.searchParams.has("batch")?responses:responses[0])});
    });
    await page.goto("http://127.0.0.1:4000/marketing");
    const panel=page.getByRole("region",{name:"مسودة Gemini المركزية",exact:true});
    await expect(panel.getByRole("button",{name:"استكمال الحفظ بدون توليد",exact:true})).toBeVisible();
    await expect(panel.getByText(/نتيجة طلب الصورة عند المزوّد غير محسومة/)).toBeVisible();
    await panel.getByRole("button",{name:"تجربة الصورة فقط",exact:true}).click();
    await expect(page.getByRole("dialog")).toContainText("لن نعيد كتابة النص");
    await page.getByRole("button",{name:"إلغاء",exact:true}).click();
    await panel.getByRole("button",{name:"تجربة الصورة فقط",exact:true}).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    const targets=await panel.locator('[aria-label^="استرجاع المهمة"] button').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
    assert.ok(targets.every(height=>height>=43.9));
    assert.ok(await panel.evaluate(node=>node.scrollWidth<=node.clientWidth));
    await page.evaluate(()=>document.documentElement.style.fontSize="200%");
    assert.ok(await panel.evaluate(node=>node.scrollWidth<=node.clientWidth));
    await page.evaluate(()=>document.documentElement.style.fontSize="");
    await panel.screenshot({path:`${directory}/${theme}-${width}.png`});
    assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
    results.push({theme,width,actionsAndBlockedState:"PASS",confirmationCancelAndEscape:"PASS",targets44:"PASS",textResize200:"PASS",panelOverflow:false,api:"intercepted; no mutations or generation"});
    await context.close();
  }
  await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
} finally {await browser.close();}
