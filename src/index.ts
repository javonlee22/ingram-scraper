import { Browser, Page, launch } from "puppeteer"
import { writeFileSync as writeFile } from "fs"
import { Product, ProductArrayPageFn, StringArrayPageFn } from "./types"
import * as constants from "./constants"
const json2xls = require("json2xls")

if (constants.EMAIL === "" || constants.PASSWORD === "") {
  console.error("No username/password environment variables found.")
  process.exit(1)
}

function extractPrice(data: string): number | null {
  let regExpArray: RegExpExecArray | null = constants.priceRegExp.exec(data)
  if (regExpArray) {
    return parseFloat(regExpArray[0])
  }
  return null
}

function extractInteger(data: string): string {
  let regExpArray: RegExpExecArray | null = constants.integerRegExp.exec(data)
  if (regExpArray) {
    return regExpArray[0]
  }
  return data
}

/**
 * Initializes a new Puppeteer Browser and returns it
 *
 * @returns Promise containing an initialized Browser object
 */
async function init(): Promise<Browser> {
  return await launch({ headless: false, defaultViewport: null })
}

/**
 *
 * @param page - Puppeteer Page object
 */
const login = async (page: Page) => {
  const usernameSelector: string = "#okta-signin-username"
  const passwordSelector: string = "#okta-signin-password"
  const submitSelector: string = "#okta-signin-submit"

  await page.goto("https://usa.ingrammicro.com/Site/Login", {
    waitUntil: "networkidle2",
  })
  await page.waitForSelector(usernameSelector)
  await page.click(usernameSelector)
  await page.keyboard.type(constants.EMAIL)
  await page.click(passwordSelector)
  await page.keyboard.type(constants.PASSWORD)
  await page.click(submitSelector)
  await page.waitForNavigation()
}

/**
 *
 * @param page - Puppeteer Page object
 * @returns Promise containing an Array of category strings
 */
async function extractCategories(page: Page): Promise<string[]> {
  // Wait for category div to load
  const categoryDivSelector = "#categorywindow"
  await page.waitForSelector(categoryDivSelector)
  return await page.evaluate<StringArrayPageFn>((selector) => {
    // Grab category div and extract title attributes from every checkbox
    let categoryDiv = document.getElementById(selector.substr(1))!
    return Array.from(categoryDiv.querySelectorAll(".checkbox")).map(
      (element) => {
        return element.getAttribute("title")!.split(" (")[0]
      }
    )
  }, categoryDivSelector)
}

// TODO: Test all field extractions

/**
 *
 * @param page - Puppeteer Page object
 * @returns Promise containing an Array of Product objects for a given page
 */
async function extractPageProductsInfo(page: Page): Promise<Product[]> {
  return await page.evaluate<ProductArrayPageFn>((selector) => {
    return Array.from(
      document.querySelectorAll(selector.productRow)
    ).map<Product>((el) => {
      let url = el.querySelector(selector.shortDescription)?.textContent!
      let sku = el.querySelector(selector.sku)?.textContent!
      let vpn = el.querySelector(selector.vpn)?.textContent!
      let upc = el.querySelector(selector.upc)?.textContent!
      let msrp = extractPrice(el.querySelector(selector.msrp)?.textContent!)!
      let vendorPrice = extractPrice(
        el.querySelector(selector.listPrice)?.textContent!
      )!
      let stock = extractInteger(el.querySelector(selector.stock)?.textContent!)
      let shortDescription = el
        .querySelector(selector.url)
        ?.getAttribute("title")!
      return {
        url,
        sku,
        vpn,
        upc,
        msrp,
        vendorPrice,
        stock,
        shortDescription,
      }
    })
  }, constants.selectorMap as any)
}

/**
 *
 * @param page - Puppeteer Page object
 * @param category - Category string
 * @returns Promise containing an Array of category strings
 */
async function extractCategoryProducts(
  page: Page,
  category: string
): Promise<Product[]> {
  const categoryCheckboxSelector = `#${category}`
  const nextArrowSelector = "#nextPage"
  await page.click(categoryCheckboxSelector)
  await page.waitForNavigation()
  let products: Product[] = []
  do {
    try {
      page.waitForSelector(nextArrowSelector)
    } catch (error) {
      break
    }
    let pageProducts = await extractPageProductsInfo(page)
    products.push(...pageProducts)
    await page.click(nextArrowSelector)
    await page.waitForNavigation()
  } while (true)
  await page.click(categoryCheckboxSelector)
  await page.waitForNavigation()
  return products
}

/**
 *
 * @param page - Puppeteer Page object
 * @returns - Promise containing an Array of all Product objects
 */
async function extractAllProducts(page: Page): Promise<Product[]> {
  let products: Product[] = []
  // Wait for search base product page to loåad
  await page.goto(constants.BASE_PRODUCT_URL, {
    waitUntil: "networkidle2",
  })
  await page.waitForSelector(constants.productRowSelector)

  // Extract all categories
  let categories = await extractCategories(page)

  for (let c of categories) {
    console.log(`Scraping ${c} category...`)
    let categoryProducts = await extractCategoryProducts(page, c)
    products.push(...categoryProducts)
  }

  await page.close()
  return products
}

function writeToExcel(products: Product[], filename: string) {
  const xls = json2xls(products)
  writeFile(filename, xls, { encoding: "binary" })
}

/**
 * Wrapper main function that serves as the entrypoint of the scraper
 */
async function main(): Promise<void> {
  let browser: Browser = await init()
  console.log("Ingram Scraper started...")
  let page = await browser.newPage()
  console.log("Logging in...")
  await login(page)
  console.log("Login Successful")
  console.log("Intializing page scraping...")
  let products = await extractAllProducts(page)
  browser.close()
  //   writeToExcel(products, "products.xlsx")
}

main()
