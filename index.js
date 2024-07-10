const PuppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const readline = require("readline");
const { url } = require("inspector");
const fs = require("fs").promises;
process.send = process.send || function () {};
const data = {
  username: "awin@searlco.com",
  password: `Se@rlcO2020??`,
};
let PageReference = null;
const scrapperFunction = async (username, password) => {
  PuppeteerExtra.use(StealthPlugin());
  const browser = await PuppeteerExtra.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--no-sandbox"],
  });
  console.log("Browser has Launched!!");

  try {
    const page = await browser.newPage();
    await page.goto("https://ui.awin.com/", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await page.waitForTimeout(500);
    await page.type("input#email", username, { delay: 100 });
    await page.type("input#password", password, { delay: 100 });
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle0", timeout: 120000 }),
    ]);
    console.log("Successfully logged in!");
    await page.waitForTimeout(200);
    await page.goto(
      "https://ui.awin.com/awin/affiliate/1051831/merchant-directory/index/tab/active/page/1",
      {
        waitUntil: "networkidle0",
        timeout: 60000,
      }
    );

    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const element = document.evaluate(
        '//a[contains(text(), "All Programs")]',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      if (element) {
        element.click();
      }
    });

    await page.waitForTimeout(1000);
    // Evaluate the script in the context of the page
    const navigateToDesiredPage = async () => {
      const goToPageDiv = await page.$(".goToPage");
      if (!goToPageDiv) {
        console.log("Element with class 'goToPage' not found.");
        return; // Exit if the target element is not found
      }
      try {
        const elementHandle = await page.$(".paginationButton");
        // Read the file outside of page.evaluate()
        const storedPageRef = await fs.readFile("pageReference.txt", "utf-8");
        const pageReference = storedPageRef.trim();
        // Then, pass the pageReference variable to page.evaluate()
        const attributeValue = await page.evaluate(
          (element, pageReference) => {
            // Inside page.evaluate(), you can now use the pageReference variable
            // Set the data-page attribute to the pageReference value
            element.setAttribute("data-page", pageReference);
            // Access the element handle and get the value of the data-page attribute
            const attributeValue = element.getAttribute("data-page");
            // Click on the element to trigger navigation
            element.click();
            // Return the attribute value for logging purposes

            return attributeValue;
          },
          elementHandle,
          pageReference
        );

        console.log("Mafe", attributeValue);
      } catch (error) {
        console.error("Error while navigating to desired page:", error);
      }
    };

    // Create a new span element
    await page.waitForTimeout(8000);

    await page.evaluate(() => {
      // Clicking on the element with class "margin-R-null"
      document.querySelector(".margin-R-null").click();

      // Setting the value of the dropdown menu directly
      document.querySelector("#pageLength").value = "40";

      // Dispatching the change event to trigger any associated event listeners
      document
        .querySelector("#pageLength")
        .dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(2000);
    await navigateToDesiredPage();
    await page.waitForTimeout(8000);
    const scrapePageData = async () => {
      // Extract URLs of each merchant profile link
      // await page.waitForTimeout(5000);
      const urls = await page.evaluate(() => {
        const links = Array.from(
          document.querySelectorAll(
            'table.merchantDirectory tbody tr td.name a[href^="/awin/affiliate/"]'
          )
        );
        return links.map((link) => link.href);
      });
      // Log the count of URLs
      console.log("Number of URLs:", urls);
      // Loop through each URL and scrape data
      for (let i = 0; i < urls.length; i++) {
        try {
          const url = urls[i];
          // Call the function to scrape data from the URL
          await page.goto(url, { waitUntil: "networkidle0", timeout: 120000 });
          await page.waitForTimeout(200);
          const selector = "h2.margin-top-sm";
          await page.waitForSelector(selector, { timeout: 120000 });
          // Data ko extract karna
          const MerchantData = await page.evaluate(() => {
            const MerchantNameElements = document.querySelector("#accountName");
            const MerchantLinkElements = document.querySelector(
              ".col-lg-12.col-sm-12.col-xs-12 .list-group-item"
            );
            const titleElement = document.querySelector("h2.margin-top-sm");
            const descriptionElement = document.querySelector(
              ".accountDescription.inlineTextArea.margin-bottom.margin-top.text-wrap"
            );
            const accountIdElement =
              document.querySelector("p#accountId strong");
            const MerchantName = MerchantNameElements
              ? MerchantNameElements.textContent.trim().replace(":", "")
              : null;
            const MerchantLink = MerchantLinkElements
              ? MerchantLinkElements.getAttribute("href")
              : null;
            const title = titleElement
              ? titleElement.textContent.trim().replace(":", "")
              : null;
            const description = descriptionElement
              ? descriptionElement.textContent.trim().replace(":", "")
              : null;
            const networkId = accountIdElement
              ? accountIdElement.textContent.trim()
              : null;
            return {
              MerchantName: MerchantName,
              website: MerchantLink,
              title: title,
              description: description,
              category: null,
              network_id: networkId,
            };
          });
          console.log(MerchantData, "aaa");
          const MerchantContact = await page.evaluate(() => {
            const nameElements = document.querySelectorAll(
              ".list-group-item h4"
            );
            const telephoneElements = document.querySelectorAll(
              ".list-group-item tbody tr:nth-child(2) td:nth-child(2)"
            );
            const emailElements = document.querySelectorAll(
              '.list-group-item td a[href^="mailto:"]'
            );
            const contactInfo = [];
            nameElements.forEach((nameElement, index) => {
              const name = nameElement.textContent.trim();
              const email = emailElements[index].textContent.trim();
              const telephone = telephoneElements[index].textContent.trim();
              contactInfo.push({ name, email, telephone });
            });
            return contactInfo;
          });
          console.log(MerchantContact, "userdata");
          const MerchantAdditionalInfo = await page.evaluate(() => {
            const profileDetailsDiv = document.getElementById("profileDetails");
            const children = profileDetailsDiv.children;
            const statusElement = children[children.length - 2];
            const accountIdElement =
              document.querySelector("p#accountId strong");
            const targetRegionsDiv = document.getElementById("targetRegions");
            const countryElements =
              targetRegionsDiv.querySelectorAll(".salesRegions li p");
            const result = [];
            countryElements.forEach((element) => {
              result.push({
                label: "region",
                value: element.textContent.trim(),
              });
            });
            const status = statusElement
              ? statusElement.textContent.trim()
              : null;
            const accountId = accountIdElement
              ? accountIdElement.textContent.trim()
              : null;
            result.push({ label: "status", value: status });
            result.push({ label: "id", value: accountId });
            return result;
          });
          console.log("additionalInfo:", MerchantAdditionalInfo);
          try {
            const apiEndpoint = "https://searlco.xyz/AwinScrap.php";
            const merchantResponse = await axios.post(apiEndpoint, {
              action: "MerchantData",
              data: MerchantData,
            });
            process.send({ message: "inserted" });
            const resMerId = await axios.post(apiEndpoint, {
              action: "MerchantId",
              merchantName: MerchantData?.MerchantName,
            });
            const merchantId = resMerId.data.merchant_id;
            const merchantAdditionalInfoResponse = await axios.post(
              apiEndpoint,
              {
                action: "MerchantAdditionalInfo",
                data: MerchantAdditionalInfo,
                merchant_id: merchantId,
              }
            );

            const merchantContactResponse = await axios.post(apiEndpoint, {
              action: "MerchantContact",
              data: MerchantContact,
              merchant_id: merchantId,
            });
          } catch (error) {
            console.error("Error calling the API:", error.message);
            process.send({ error: error.message });
          }
        } catch (error) {
          process.send({ error: error.message });
        }
        await page.goBack({ timeout: 100000 });
        await page.waitForTimeout(5000);
        await page.evaluate(() => {
          const element = document.evaluate(
            '//a[contains(text(), "All Programs")]',
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
          if (element) {
            element.click();
          }
        });
        await page.waitForTimeout(2000);
      }
      await page.waitForTimeout(2000);
      await navigateToDesiredPage();
      await page.waitForTimeout(5000);
      // Call the function to navigate to the desired page
      console.log("loop");
      const nextButton = await page.$("#nextPage");
      if (nextButton) {
        nextButton.click();
      }
      await page.waitForTimeout(5000);

      // Wait for the current page number selector to be loaded
      await page.waitForSelector("#currentPage", { timeout: 120000 });
      // Get the current page number
      currentPage = await page.evaluate(() => {
        const currentPageElement = document.querySelector("#currentPage");
        if (currentPageElement) {
          // console.log("test");
        }
        return currentPageElement ? currentPageElement.innerText : null;
      });

      await fs.writeFile("pageReference.txt", currentPage);
      console.log(currentPage, "curr");
      await page.waitForTimeout(5000);
      await scrapePageData();
    };
    await scrapePageData();
    browser.close();
    return "Done";
  } catch (error) {
    process.send({ error: error.message });
    // clearTimer();
    setTimeout(() => {
      browser.close();
      return {};
    }, 1000);
  }
};

const mainFunction = async () => {
  const result = await scrapperFunction(data.username, data.password);
  console.log("Getting the final ====> ", result);
  process.exit(0);
};
mainFunction();
