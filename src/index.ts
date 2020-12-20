import { Browser, Page, launch } from "puppeteer"
// import * as json2xls from "json2xls"
import { writeFileSync as writeFile } from "fs"
import dotenv from "dotenv"
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

const EMAIL: string = process.env.EMAIL ?? ""
const PASSWORD: string = process.env.PASSWORD ?? ""
const BASE_URL: string = "https://usa.ingrammicro.com"

if (EMAIL === "" || PASSWORD === "") {
  console.error("No username/password environment variables found.")
  process.exit(1)
}

async function init(): Promise<Browser> {
  return await launch({ headless: false, defaultViewport: null })
}

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

async function extractPageProductLinks(
  page: Page,
  selector: string
): Promise<string[]> {
  // Callback signature for extracting all hrefs from a page
  type ProductRowPageFn = (selector: string) => string[]

  // Extract all product links on page
  return await page.evaluate<ProductRowPageFn>((selector) => {
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

async function extractPageProductsInfo(
  page: Page,
  hrefs: string[]
): Promise<Product[] | []> {
  hrefs.forEach(async (href) => {
    const productUrl = BASE_URL + href
    page.goto(productUrl, { waitUntil: "networkidle2" })
    await page.waitForSelector("#imgProductDetails")
  })
  return []
}

async function extractAllProducts(page: Page): Promise<Product[] | []> {
  const productRowSelector = "div.row.product"
  await page.goto("https://usa.ingrammicro.com/Site/Search#", {
    waitUntil: "networkidle2",
  })
  await page.waitForSelector(productRowSelector)

  let productHrefs = await extractPageProductLinks(page, productRowSelector)
  await page.close()
  return []
}

async function main(): Promise<void> {
  let browser: Browser = await init()
  let page = await browser.newPage()
  await login(page)
  let products = await extractAllProducts(page)
  browser.close()
  const data: string = JSON.stringify(products)
  writeFile("products.json", data)
}

main()
