import { Browser, Page, launch } from "puppeteer"
import { writeFileSync as writeFile } from "fs"
import { Product, ProductArrayPageFn, StringArrayPageFn } from "./types"
import * as constants from "./constants"
const json2xls = require("json2xls")

if (constants.EMAIL === "" || constants.PASSWORD === "") {
  console.error("No username/password environment variables found.")
  process.exit(1)
}

/**
 * Searches a string for price data
 *
 * @param data - String to be searched
 * @returns Price in decimal format or null
 */
function extractPrice(data: string): number | null {
  let regExpArray: RegExpExecArray | null = constants.priceRegExp.exec(data)
  if (regExpArray) {
    return parseFloat(regExpArray[0])
  }
  return null
}

/**
 * Searches a string for integer data
 *
 * @param data - String to be searched
 * @returns An integer or null
 */
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
 * Log into the website to view all product listing information
 *
 * @param page - Puppeteer Page object
 */
async function login(page: Page) {
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
 * Extracts all product categories
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

/**
 *  Extracts relevant data from all product listings on the current page
 *
 * @param page - Puppeteer Page object
 * @returns Promise containing an Array of Product objects for a given page
 */
async function extractPageProductsInfo(page: Page): Promise<Product[]> {
  await page.waitForSelector(constants.selectorMap.productRow, {
    visible: true,
  })
  await page.waitForSelector(constants.selectorMap.listPrice, { visible: true })
  let products = await page.evaluate<ProductArrayPageFn>((selector) => {
    return Array.from(
      document.querySelectorAll(selector.productRow)
    ).map<Product>((el) => {
      // TODO: Figure out why the prices aren't being found by the query selector

      let url = el.querySelector(selector.url)?.getAttribute("href")!
      let sku = el.querySelector(selector.sku)?.textContent!
      let vpn = el.querySelector(selector.vpn)?.textContent!
      let upc = el.querySelector(selector.upc)?.textContent!
      let msrp = el.querySelector(selector.msrp)?.innerHTML!
      let vendorPrice = el.querySelector(selector.listPrice)?.textContent!
      let stock = el.querySelector(selector.stock)?.textContent!
      let shortDescription = el.querySelector(selector.shortDescription)
        ?.textContent!
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
  console.log(products)
  products.forEach((p) => {
    p.msrp = extractPrice(p.msrp as string)!
    p.vendorPrice = extractPrice(p.vendorPrice as string)!
    p.stock = extractInteger(p.stock as string)!
  })
  return products
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
  const categoryCheckboxSelector = `input[id='${category}']`
  const nextArrowSelector = "#nextPage"
  await page.click(categoryCheckboxSelector)
  await page.waitForNavigation()
  let products: Product[] = []
  do {
    try {
      page.waitForSelector(nextArrowSelector, { visible: true })
    } catch (error) {
      break
    }
    let pageProducts = await extractPageProductsInfo(page)
    products.push(...pageProducts)
    await page.click(nextArrowSelector)
    await page.waitForTimeout(5000)
  } while (true)
  await page.click(categoryCheckboxSelector)
  return products
}

/**
 * Startst the process of extracting all relevant products from the website
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

/**
 * Takes an array of products and writes them to an excel file
 *
 * @param products - Puppeteer Page object
 * @param filename - Name of the file
 */
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
