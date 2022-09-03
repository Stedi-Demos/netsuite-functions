import crypto from "node:crypto";

type RestClientConfig = {
  consumerKey: string;
  consumerSecretKey: string;
  token: string;
  tokenSecret: string;
  realm: string;
};

export class NetsuiteRestApiClient {
  private consumerKey: string;
  private consumerSecretKey: string;
  private token: string;
  private tokenSecret: string;
  private realm: string;

  constructor(options: RestClientConfig) {
    this.consumerKey = options.consumerKey;
    this.consumerSecretKey = options.consumerSecretKey;
    this.token = options.token;
    this.tokenSecret = options.tokenSecret;
    this.realm = options.realm;
  }

  public generateOAuth(httpMethod: string, url: string) {
    const timestamp = generateTimeStamp();
    const nonce = generateNonce();

    let baseString = this.getBaseString(httpMethod, url, timestamp, nonce);

    const key = encode(this.consumerSecretKey) + "&" + encode(this.tokenSecret);

    const signature = encode(
      crypto.createHmac("sha256", key).update(baseString).digest("base64")
    );

    const authHeader =
      `OAuth realm="${this.realm}", oauth_consumer_key="${this.consumerKey}", ` +
      `oauth_nonce="${nonce}", oauth_signature="${signature}", ` +
      `oauth_signature_method="HMAC-SHA256", oauth_timestamp="${timestamp}", ` +
      `oauth_token="${this.token}", oauth_version="1.0"`;

    return {
      timestamp,
      nonce,
      baseString,
      signature,
      authHeader,
    };
  }

  private getBaseString(
    httpMethod: string,
    uri: string,
    timestamp: number,
    nonce: string
  ) {
    const url = new URL(uri);
    let baseUrl = `${url.origin}${url.pathname}`;
    let data = Object.fromEntries(url.searchParams);

    data["oauth_consumer_key"] = this.consumerKey;
    data["oauth_nonce"] = nonce;
    data["oauth_signature_method"] = "HMAC-SHA256";
    data["oauth_timestamp"] = timestamp.toString();
    data["oauth_token"] = this.token;
    data["oauth_version"] = "1.0";

    let _sorted = Object.keys(data).sort();

    //Create BaseString
    let baseString = httpMethod.toUpperCase() + "&";
    baseString += encode(baseUrl) + "&";

    for (let i = 0; i < _sorted.length; i++) {
      let str = _sorted[i] + "=" + encodeURIComponent(data[_sorted[i]]) + "&";
      if (i === _sorted.length - 1) {
        str = str.replace("&", "");
      }
      baseString += encode(str);
    }

    return baseString;
  }
}

function encode(str: string) {
  return encodeURIComponent(str)
    .replace(/\!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/\'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/:/gi, "%3A")
    .replace(/\)/g, "%29");
}

function generateNonce() {
  const word_characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < 12; i++) {
    result +=
      word_characters[Math.floor(Math.random() * word_characters.length)];
  }

  return result;
}

function generateTimeStamp() {
  return Math.round(new Date().getTime() / 1000);
}
