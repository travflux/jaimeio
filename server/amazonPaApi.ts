/**
 * Amazon Product Advertising API v5 — raw fetch with AWS Signature V4
 * No SDK dependency. Credentials gated — silently skips when not configured.
 */
import crypto from "crypto";

export interface AmazonProduct {
  asin: string;
  title: string;
  imageUrl: string | null;
  price: string | null;
  affiliateUrl: string;
  rating: number | null;
  reviewCount: number | null;
}

interface PaApiCredentials {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  host: string;
  region: string;
}

function sign(key: Buffer, msg: string): Buffer {
  return crypto.createHmac("sha256", key).update(msg).digest();
}

function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
  return sign(sign(sign(sign(Buffer.from("AWS4" + key), dateStamp), region), service), "aws4_request");
}

async function paApiRequest(creds: PaApiCredentials, operation: string, payload: object): Promise<any> {
  const endpoint = `https://${creds.host}/paapi5/${operation.toLowerCase()}`;
  const service = "ProductAdvertisingAPI";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").substring(0, 15) + "Z";
  const dateStamp = amzDate.substring(0, 8);
  const bodyStr = JSON.stringify(payload);
  const payloadHash = crypto.createHash("sha256").update(bodyStr).digest("hex");

  const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${creds.host}\nx-amz-date:${amzDate}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = ["POST", `/paapi5/${operation.toLowerCase()}`, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${creds.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, crypto.createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
  const signingKey = getSignatureKey(creds.secretKey, dateStamp, creds.region, service);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "amz-1.0",
      "Content-Type": "application/json; charset=utf-8",
      "Host": creds.host,
      "X-Amz-Date": amzDate,
      "X-Amz-Target": `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`,
      "Authorization": `AWS4-HMAC-SHA256 Credential=${creds.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: bodyStr,
  });
  if (!response.ok) throw new Error(`PA API ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function searchAmazonProducts(
  keyword: string, creds: PaApiCredentials, minRating = 4.0, maxPrice = 200
): Promise<AmazonProduct[]> {
  await new Promise(r => setTimeout(r, 1100)); // PA API rate limit
  try {
    const result = await paApiRequest(creds, "SearchItems", {
      Keywords: keyword, PartnerTag: creds.partnerTag, PartnerType: "Associates",
      SearchIndex: "All", ItemCount: 5,
      Resources: ["Images.Primary.Medium", "ItemInfo.Title", "Offers.Listings.Price"],
    });
    return (result?.SearchResult?.Items ?? []).map((item: any) => ({
      asin: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue ?? "",
      imageUrl: item.Images?.Primary?.Medium?.URL ?? null,
      price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount ?? null,
      affiliateUrl: `https://www.amazon.com/dp/${item.ASIN}?tag=${creds.partnerTag}`,
      rating: null, reviewCount: null,
    })).filter((p: AmazonProduct) => {
      if (p.price && maxPrice) { const n = parseFloat(p.price.replace(/[^0-9.]/g, "")); if (!isNaN(n) && n > maxPrice) return false; }
      return true;
    });
  } catch (err) { console.error("[AmazonPaApi] Search failed:", keyword, err); return []; }
}
