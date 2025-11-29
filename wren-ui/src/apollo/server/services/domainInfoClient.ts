import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { MS_SQL_CONNECTION_INFO } from '../repositories';

// همون اینترفیس MSSQL پروژه خودت
// export interface MS_SQL_CONNECTION_INFO {
//   host: string;
//   port: number;
//   user: string;
//   password: string;
//   database: string;
//   trustServerCertificate: boolean;
// }

// اگر خواستی می‌تونی DomainInfo رو هم قشنگ تایپ کنی
export interface DomainInfoDto {
  AuthenticationProvider?: any;
  CanManageUsers?: boolean;
  ConnectionString: string;
  DbCatalogName: string;
  DbServerAddress: string;
  DbVersion: number;
  DomainId: string;
  LocalUrl: string;
  PublicUrl: string;
  Scheme: string;
  Url: string;
}

// ۱) زدن خود SOAP
export async function getDomainInfoByHost(
  host: string,
): Promise<DomainInfoDto> {
  const endpoint =
    process.env.DOMAIN_INFO_API_URL ||
    'http://192.168.34.184:7014/DomainInfoManagerApi';

  //host = "salanati.com";
  const urlParam = `${host}`;

  const soapEnvelope = `
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <GetDomainInfo xmlns="http://tempuri.org/">
      <url>${urlParam}</url>
    </GetDomainInfo>
  </s:Body>
</s:Envelope>`.trim();

  const response = await axios.post(endpoint, soapEnvelope, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'http://tempuri.org/IDomainInfoManagerApi/GetDomainInfo',
    },
    timeout: 10000,
  });

  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  const json = parser.parse(response.data);

  const envelope = json.Envelope;
  const body = envelope.Body;

  const result = body.GetDomainInfoResponse.GetDomainInfoResult;

  const dto: DomainInfoDto = {
    AuthenticationProvider: result.AuthenticationProvider,
    CanManageUsers:
      result.CanManageUsers === 'true' || result.CanManageUsers === true,
    ConnectionString: result.ConnectionString,
    DbCatalogName: result.DbCatalogName,
    DbServerAddress: result.DbServerAddress,
    DbVersion: Number(result.DbVersion),
    DomainId: result.DomainId,
    LocalUrl: result.LocalUrl,
    PublicUrl: result.PublicUrl,
    Scheme: result.Scheme,
    Url: result.Url,
  };
  return dto;
}

function parseConnectionString(cs: string): Record<string, string> {
  const parts = cs
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
  const map: Record<string, string> = {};
  for (const part of parts) {
    const [key, ...rest] = part.split('=');
    if (!key) continue;
    map[key.trim().toLowerCase()] = rest.join('=').trim();
  }
  return map;
}

function extractHostAndPort(
  dataSource: string,
  fallbackHost?: string,
  fallbackPort = 1433,
): { host: string; port: number } {
  let ds = dataSource || fallbackHost || '';
  let host = ds;
  let port = fallbackPort;

  // tcp:192.168.1.1,1433 → 192.168.1.1,1433
  if (ds.toLowerCase().startsWith('tcp:')) {
    ds = ds.substring(4);
  }

  // حالت server,port
  const parts = ds.split(',');
  if (parts.length === 2) {
    host = parts[0];
    const p = parseInt(parts[1], 10);
    if (!Number.isNaN(p)) {
      port = p;
    }
  } else {
    host = ds;
  }

  return { host, port };
}

export function buildMsSqlConnectionInfoFromDomainInfo(
  domain: DomainInfoDto,
): MS_SQL_CONNECTION_INFO {
  const map = parseConnectionString(domain.ConnectionString || '');

  const dataSource =
    map['data source'] ||
    map['server'] ||
    map['addr'] ||
    map['address'] ||
    map['network address'] ||
    domain.DbServerAddress;

  const dbName =
    map['initial catalog'] || map['database'] || domain.DbCatalogName;

  const user = map['user id'] || map['uid'] || map['user'] || '';

  const password = map['password'] || map['pwd'] || '';

  const trust = (map['trustservercertificate'] || '').toLowerCase() === 'true';

  let host: string;
  let port: number;

  if (dataSource.includes('\\')) {
    // مثال: "192.168.11.6\\PayamGostarV2"
    const [server, instanceName] = dataSource.split('\\');

    host = server;
    // پورت رو از env یا config بخون، اگر ندادی 1433
    port = Number(process.env.MSSQL_INSTANCE_PORT || '1433');

    // اگر خواستی بعداً این مپ رو داشته باشی:
    // مثلا MSSQL_INSTANCE_PORT_PayamGostarV2
    // const key = `MSSQL_INSTANCE_PORT_${instanceName}`;
    // port = Number(process.env[key] || process.env.MSSQL_INSTANCE_PORT || '1433');
  } else {
    // این قبلیه: حالت server,port و...
    const hp = extractHostAndPort(dataSource, domain.DbServerAddress, 1433);
    host = hp.host;
    port = hp.port;
  }

  // const { host, port } = extractHostAndPort(
  //     dataSource,
  //     domain.DbServerAddress,
  //     1433,
  // );

  return {
    host, // تو مثال تو: "192.168.11.6\\PayamGostarV2"
    port, // چون پورتی تو کانکشن نیست → 1433
    user, // "sa"
    password, // پسوردی که اومده
    database: dbName, // "PGV2_Dev"
    trustServerCertificate: trust,
  };
}
