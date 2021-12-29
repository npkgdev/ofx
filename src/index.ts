import fs from "fs";
const XmlParser = require("xml2js").Parser;

interface OfxData {
  header?: any;
  info: {
    bankName         : string;
    bankId           : string;
    bankMarketingInfo: string;
    accountId        : string;
    currencyCode     : string;
    language         : string;
    balance          : {
      amt : number;
      date: string;
    }
  }
  transactions: {
    type       : string;
    date       : string;
    amt        : number;
    id         : string;
    checknum   : string;
    description: string;
  }
}

function sgml2Xml (sgml: string) {
  return sgml
    // Remove empty spaces and line breaks between tags
    .replace(/>\s+</g, "><")
    // Remove empty spaces and line breaks before tags content
    .replace(/\s+</g, "<")
    // Remove empty spaces and line breaks after tags content
    .replace(/>\s+/g, ">")
    // Remove dots in start-tags names and remove end-tags with dots
    .replace(/<([A-Z0-9_]*)+\.+([A-Z0-9_]*)>([^<]+)(<\/\1\.\2>)?/g, "<\$1\$2>\$3")
    // Add a new end-tags for the ofx elements
    .replace(/<(\w+?)>([^<]+)/g, "<\$1>\$2</<added>\$1>")
    // Remove duplicate end-tags
    .replace(/<\/<added>(\w+?)>(<\/\1>)?/g, "</\$1>");
}

/**
 * Given an XML string, parse it and return it as a JSON-friendly Javascript object
 *
 * @param {string} xml The XML to parse
 *
 * @returns {Promise} A promise that will resolve to the parsed XML as a JSON-style object
 */
function parseXml (xml: string): Promise<any> {
  const xmlParser = new XmlParser({explicitArray: false});
  return new Promise((resolve, reject) => {
    xmlParser.parseString(xml, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Given a string of OFX data, parse it.
 *
 * @param {string} data The OFX data to parse
 *
 * @returns {Promise} A promise that will resolve to the parsed data.
 */
export async function parseString (data): Promise<OfxData> {
  // firstly, split into the header attributes and the footer sgml
  const ofx = data.split('<OFX>', 2);

  // firstly, parse the headers
  const headerString = ofx[0].split(/\r?\n/);
  const header = {};
  headerString.forEach((attrs) => {
      const headAttr = attrs.split(/:/,2);
      header[headAttr[0]] = headAttr[1];
  });

  // make the SGML and the XML
  const content = `<OFX>${ofx[1]}`;

  // Parse the XML/SGML portion of the file into an object
  // Try as XML first, and if that fails do the SGML->XML mangling
  let dataParsed = null;
  try {
    dataParsed = await parseXml(content);
  } catch (e) {
    dataParsed = await parseXml(sgml2Xml(content));
  }

  // put the headers into the returned data
  dataParsed.header = header;

  const ofxData = dataParsed;

  const {
    LANGUAGE: language,
    FI: {
      ORG: bankName,
      FID: bankId
    }
  } = ofxData.OFX.SIGNONMSGSRSV1.SONRS;
  // const bankName             = ofxData.OFX.SIGNONMSGSRSV1.SONRS.FI.ORG;
  // const bankId               = ofxData.OFX.SIGNONMSGSRSV1.SONRS.FI.FID;
  const statementResponse    = ofxData.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS;
  const accountId            = statementResponse.BANKACCTFROM.ACCTID;
  const currencyCode         = statementResponse.CURDEF;
  const transactionStatement = statementResponse.BANKTRANLIST.STMTTRN;
  const balance              = statementResponse.LEDGERBAL;
  const bankMarketingInfo    = statementResponse.MKTGINFO;

  // return dataParsed;
  return {
    header: ofxData.header,
    info: {
      bankName,
      bankId,
      bankMarketingInfo,
      accountId,
      currencyCode,
      language,
      balance: {
        amt: +balance.BALAMT,
        date  : balance.DTASOF.substring(0, 4) + "-" + balance.DTASOF.substring(4, 6) + "-" + balance.DTASOF.substring(6, 8)
      }
    },
    transactions: transactionStatement?.map(el => {
      const date = el?.DTPOSTED;

      return {
        type       : el?.TRNTYPE,
        date       : date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6, 8),
        amt        : +(el?.TRNAMT?.replace(",", ".")),
        id         : el?.FITID,
        checknum   : el?.CHECKNUM,
        description: el?.MEMO
      }
    }),
    // OFX: ofxData.OFX
  }
}

/**
 * Given a string of OFX data, parse it.
 *
 * @param {string} path File path
 * @param {BufferEncoding} encoding File encoding
 *
 * @returns {Promise} A promise that will resolve to the parsed data.
 */
 export async function parseFile (path: string, encoding: BufferEncoding = "latin1"): Promise<OfxData> {
  const data: string = fs.readFileSync(path, encoding);

  return parseString(data);
}
