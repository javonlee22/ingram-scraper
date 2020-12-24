import { Browser, Page, launch } from "puppeteer"
import { writeFileSync as writeFile } from "fs"
import dotenv from "dotenv"
const json2xls = require("json2xls")

dotenv.config()

interface Product {
  vpn: string
  msrp: number
  vendorPrice: number
  discount?: number
  stock: number
  sku: string
  upc: string
  shortDescription?: string
  longDescription?: string
}

type StringArrayPageFn = (selector: string) => string[]

const EMAIL: string = process.env.EMAIL ?? ""
const PASSWORD: string = process.env.PASSWORD ?? ""
const BASE_URL: string = "https://usa.ingrammicro.com"
const BASE_PRODUCT_URL = "https://usa.ingrammicro.com/Site/Search#"
const productRowSelector = "div.row.product"

if (EMAIL === "" || PASSWORD === "") {
  console.error("No username/password environment variables found.")
  process.exit(1)
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
  await page.keyboard.type(EMAIL)
  await page.click(passwordSelector)
  await page.keyboard.type(PASSWORD)
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

/**
 *
 * @param page - Puppeteer Page object
 * @param selector - CSS selector string
 * @returns Promise conataining an Array of product href strings
 */
async function extractPageProductLinks(
  page: Page,
  selector: string
): Promise<string[]> {
  // Extract all product links on page
  return await page.evaluate<StringArrayPageFn>((selector) => {
    const productLinkSelector: string = 'a[data-name="search_result_link"]'
    return Array.from(document.querySelectorAll(selector))
      .filter((element) => element.querySelector(productLinkSelector) !== null)
      .map((productRow) => {
        const productLinkElement = productRow.querySelector(
          productLinkSelector
        )!
        return productLinkElement.getAttribute("href")!
      })
  }, selector)
}

/**
 *
 * @param page - Puppeteer Page object
 * @param hrefs - Array of href strings
 * @returns Promise containing an Array of Product objects for a given page
 */
async function extractPageProductsInfo(
  page: Page,
  hrefs: string[]
): Promise<Product[]> {
  hrefs.forEach(async (href) => {
    const productUrl = BASE_URL + href
    page.goto(productUrl, { waitUntil: "networkidle2" })
    await page.waitForSelector("#imgProductDetails")
    page.goBack({ waitUntil: "networkidle2" })
  })
  return [] as Product[]
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
  let productHrefs = await extractPageProductLinks(page, productRowSelector)
  return [] as Product[]
}

/**
 *
 * @param page - Puppeteer Page object
 * @returns - Promise containing an Array of all Product objects
 */
async function extractAllProducts(page: Page): Promise<Product[]> {
  let products: Product[] = []
  // Wait for search base product page to load
  await page.goto(BASE_PRODUCT_URL, {
    waitUntil: "networkidle2",
  })
  await page.waitForSelector(productRowSelector)

  // Extract all categories
  let categories = await extractCategories(page)

  for (let c of categories) {
    console.log(`Scraping ${c} category...`)
    let categoryProducts = await extractCategoryProducts(page, c)
    products = products.concat(categoryProducts)
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
