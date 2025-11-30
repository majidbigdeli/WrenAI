import { GraphQLError } from 'graphql';
import { WrenService } from '../telemetry/telemetry';

export enum GeneralErrorCodes {
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  // AI service errors
  NO_RELEVANT_DATA = 'NO_RELEVANT_DATA',
  NO_RELEVANT_SQL = 'NO_RELEVANT_SQL',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  MDL_PARSE_ERROR = 'MDL_PARSE_ERROR',
  NO_CHART = 'NO_CHART',

  // Exception error for AI service (e.g., network connection error)
  AI_SERVICE_UNDEFINED_ERROR = 'OTHERS',

  // IBIS Error
  IBIS_SERVER_ERROR = 'IBIS_SERVER_ERROR',

  // Connector errors
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  // duckdb
  INIT_SQL_ERROR = 'INIT_SQL_ERROR',
  SESSION_PROPS_ERROR = 'SESSION_PROPS_ERROR',
  // postgres
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  // calculated field validation
  DUPLICATED_FIELD_NAME = 'DUPLICATED_FIELD_NAME',
  INVALID_EXPRESSION = 'INVALID_EXPRESSION',
  INVALID_CALCULATED_FIELD = 'INVALID_CALCULATED_FIELD',

  // when createing views
  INVALID_VIEW_CREATION = 'INVALID_VIEW_CREATION',

  // dry run error
  DRY_RUN_ERROR = 'DRY_RUN_ERROR',
  DRY_PLAN_ERROR = 'DRY_PLAN_ERROR',

  // deploy sql pair error
  DEPLOY_SQL_PAIR_ERROR = 'DEPLOY_SQL_PAIR_ERROR',
  GENERATE_QUESTIONS_ERROR = 'GENERATE_QUESTIONS_ERROR',
  INVALID_SQL_ERROR = 'INVALID_SQL_ERROR',

  // wren engine error
  WREN_ENGINE_ERROR = 'WREN_ENGINE_ERROR',

  // asking task error
  // when rerun from cancelled, the task is identified as general or misleading query
  IDENTIED_AS_GENERAL = 'IDENTIED_AS_GENERAL',
  IDENTIED_AS_MISLEADING_QUERY = 'IDENTIED_AS_MISLEADING_QUERY',
  DEPLOY_TIMEOUT_ERROR = 'DEPLOY_TIMEOUT_ERROR',

  // api error
  NON_SQL_QUERY = 'NON_SQL_QUERY',
  NO_DEPLOYMENT_FOUND = 'NO_DEPLOYMENT_FOUND',

  // vega schema error
  FAILED_TO_GENERATE_VEGA_SCHEMA = 'FAILED_TO_GENERATE_VEGA_SCHEMA',
  POLLING_TIMEOUT = 'POLLING_TIMEOUT',

  // sql execution error
  SQL_EXECUTION_ERROR = 'SQL_EXECUTION_ERROR',
}

export const errorMessages = {
  [GeneralErrorCodes.INTERNAL_SERVER_ERROR]: 'خطای داخلی سرور',

  // AI service errors
  [GeneralErrorCodes.NO_RELEVANT_DATA]:
    'من نمی‌توانم دادهٔ دقیقی که به دنبال آن هستید پیدا کنم، اما می‌توانید دربارهٔ موضوعات دیگر سوال کنید.',
  [GeneralErrorCodes.NO_RELEVANT_SQL]:
    'آیا می‌توانید اطلاعات بیشتری ارائه دهید یا مشخص کنید که به چه چیزی نیاز دارید؟',
  [GeneralErrorCodes.NO_CHART]:
    'نمودار در این بار تولید نشد. لطفاً دوباره تلاش کنید یا سوال خود را به شکل دیگری بیان کنید تا نتایج بهتری بگیرید.',

  // Connector errors
  [GeneralErrorCodes.CONNECTION_ERROR]: 'نمی‌توان به منبع داده متصل شد',
  // duckdb
  [GeneralErrorCodes.INIT_SQL_ERROR]:
    'SQL اولیه به نظر نامعتبر می‌رسد، لطفاً SQL خود را بررسی کرده و دوباره تلاش کنید.',
  [GeneralErrorCodes.SESSION_PROPS_ERROR]:
    'به نظر می‌رسد که ویژگی‌های جلسه نامعتبر هستند، لطفاً ویژگی‌های خود را بررسی کرده و دوباره تلاش کنید.',
  // postgres
  [GeneralErrorCodes.CONNECTION_REFUSED]:
    'اتصال توسط سرور رد شد، لطفاً تنظیمات اتصال خود را بررسی کرده و دوباره تلاش کنید.',

  // ibis service errors
  [GeneralErrorCodes.IBIS_SERVER_ERROR]:
    'در هنگام پرسش از سرور ایبیس خطایی رخ داده است، لطفاً بعداً دوباره تلاش کنید.',

  // calculated field validation
  [GeneralErrorCodes.DUPLICATED_FIELD_NAME]: 'این نام فیلد قبلاً وجود دارد',
  [GeneralErrorCodes.INVALID_EXPRESSION]:
    'عبارت نامعتبر است، لطفاً عبارت خود را بررسی کرده و دوباره تلاش کنید.',
  [GeneralErrorCodes.INVALID_CALCULATED_FIELD]:
    'نمی‌توان یک پرس و جو را هنگام استفاده از این فیلد محاسبه شده اجرا کرد',

  // when creating views
  [GeneralErrorCodes.INVALID_VIEW_CREATION]: 'ایجاد نمای نامعتبر است',

  // dry run error
  [GeneralErrorCodes.DRY_RUN_ERROR]: 'خطای بیان SQL در حالت آزمایشی',
  [GeneralErrorCodes.DRY_PLAN_ERROR]: 'خطای برنامه آزمایشی',

  // deploy sql pair error
  [GeneralErrorCodes.DEPLOY_SQL_PAIR_ERROR]: 'خطای استقرار جفت SQL',
  [GeneralErrorCodes.GENERATE_QUESTIONS_ERROR]: 'خطا در تولید سوالات',
  [GeneralErrorCodes.INVALID_SQL_ERROR]:
    'SQL نامعتبر است، لطفاً سینتاکس SQL خود را بررسی کنید',

  // asking task error
  [GeneralErrorCodes.IDENTIED_AS_GENERAL]:
    'سوال به عنوان سوال عمومی شناسایی شده است، لطفاً با سوالات خاص‌تری پیگیری کنید.',
  [GeneralErrorCodes.IDENTIED_AS_MISLEADING_QUERY]:
    'سوال به عنوان یک پرسش گمراه‌کننده شناسایی شده است، لطفاً با سوالات خاص‌تری پیگیری کنید.',
  [GeneralErrorCodes.DEPLOY_TIMEOUT_ERROR]:
    'زمان استقرار LLM پس از ۳۰ ثانیه به پایان رسید',

  // api error
  [GeneralErrorCodes.NON_SQL_QUERY]: 'نمی‌توان SQL را از این سوال تولید کرد.',
  [GeneralErrorCodes.NO_DEPLOYMENT_FOUND]:
    'هیچ استقراری یافت نشد، لطفاً ابتدا پروژه خود را مستقر کنید',

  // vega schema error
  [GeneralErrorCodes.FAILED_TO_GENERATE_VEGA_SCHEMA]:
    'خطا در تولید مشخصات وگا',
  [GeneralErrorCodes.POLLING_TIMEOUT]: 'زمان‌بندی درخواست به پایان رسید',

  // sql execution error
  [GeneralErrorCodes.SQL_EXECUTION_ERROR]: 'خطای اجرای SQL',
};

export const shortMessages = {
  [GeneralErrorCodes.INTERNAL_SERVER_ERROR]: 'خطای داخلی سرور',
  [GeneralErrorCodes.NO_RELEVANT_DATA]: 'یک پرسش متفاوت را امتحان کنید',
  [GeneralErrorCodes.NO_RELEVANT_SQL]: 'نیاز به توضیح بیشتر',
  [GeneralErrorCodes.NO_CHART]: 'نمودار در دسترس نیست',
  [GeneralErrorCodes.CONNECTION_ERROR]: 'اتصال برقرار نشد',
  [GeneralErrorCodes.IBIS_SERVER_ERROR]: 'خطای اتصال به داده‌ها',
  [GeneralErrorCodes.INIT_SQL_ERROR]: 'SQL اولیه نامعتبر است',
  [GeneralErrorCodes.SESSION_PROPS_ERROR]: 'ویژگی‌های جلسه نامعتبر هستند',
  [GeneralErrorCodes.CONNECTION_REFUSED]: 'اتصال رد شد',
  [GeneralErrorCodes.DUPLICATED_FIELD_NAME]: 'نام فیلد تکراری است',
  [GeneralErrorCodes.INVALID_EXPRESSION]: 'عبارت نامعتبر است',
  [GeneralErrorCodes.INVALID_CALCULATED_FIELD]: 'فیلد محاسبه شده نامعتبر است',
  [GeneralErrorCodes.INVALID_VIEW_CREATION]: 'ایجاد نمای نامعتبر است',
  [GeneralErrorCodes.DRY_RUN_ERROR]: 'خطای بیان SQL در حالت آزمایشی',
  [GeneralErrorCodes.DRY_PLAN_ERROR]: 'خطای برنامه آزمایشی',
  [GeneralErrorCodes.DEPLOY_SQL_PAIR_ERROR]: 'خطای استقرار جفت SQL',
  [GeneralErrorCodes.GENERATE_QUESTIONS_ERROR]: 'خطا در تولید سوالات',
  [GeneralErrorCodes.INVALID_SQL_ERROR]: 'SQL نامعتبر است، لطفاً سینتاکس SQL خود را بررسی کنید',
  [GeneralErrorCodes.IDENTIED_AS_GENERAL]: 'شناسایی به عنوان سوال عمومی',
  [GeneralErrorCodes.IDENTIED_AS_MISLEADING_QUERY]: 'شناسایی به عنوان پرسش گمراه‌کننده',
  [GeneralErrorCodes.DEPLOY_TIMEOUT_ERROR]: 'زمان استقرار LLM به پایان رسید',
  [GeneralErrorCodes.NON_SQL_QUERY]: 'نمی‌توان SQL را از این سوال تولید کرد.',
  [GeneralErrorCodes.NO_DEPLOYMENT_FOUND]: 'هیچ استقراری یافت نشد، لطفاً ابتدا پروژه خود را مستقر کنید',
  [GeneralErrorCodes.FAILED_TO_GENERATE_VEGA_SCHEMA]: 'خطا در تولید مشخصات وگا',
  [GeneralErrorCodes.POLLING_TIMEOUT]: 'زمان‌بندی درخواست به پایان رسید',
  [GeneralErrorCodes.SQL_EXECUTION_ERROR]: 'خطای اجرای SQL',
};

export const create = (
  code?: GeneralErrorCodes,
  options?: {
    customMessage?: string;
    originalError?: Error;
    service?: WrenService;
    other?: any;
  },
): GraphQLError => {
  const { customMessage, originalError, service } = options || {};
  // Default to INTERNAL_SERVER_ERROR if no code is provided
  code = code || GeneralErrorCodes.INTERNAL_SERVER_ERROR;

  // Get the error message based on the code
  const message =
    customMessage ||
    originalError?.message ||
    errorMessages[code] ||
    errorMessages[GeneralErrorCodes.INTERNAL_SERVER_ERROR];

  // Return the GraphQLError
  const err = new GraphQLError(message, {
    extensions: {
      originalError,
      code,
      message,
      service,
      shortMessage:
        shortMessages[code] ||
        shortMessages[GeneralErrorCodes.INTERNAL_SERVER_ERROR],
      other: options?.other,
    },
  });

  return err;
};

/**
 * Default error handler for Apollo Server
 * For error like this:
 * [GraphQLError: connect ECONNREFUSED 127.0.0.1:8080] {
 *   locations: [ { line: 2, column: 3 } ],
 *   path: [ 'previewData' ],
 *   extensions: {
 *     code: 'INTERNAL_SERVER_ERROR',
 *     exception: {
 *       port: 8080,
 *       address: '127.0.0.1',
 *       syscall: 'connect',
 *       code: 'ECONNREFUSED',
 *       errno: -61,
 *       message: 'connect ECONNREFUSED 127.0.0.1:8080',
 *       stack: 'Error: connect ECONNREFUSED 127.0.0.1:8080\n' +
 *         '    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1278:16)',
 *       name: 'Error',
 *       config: [Object],
 *       request: [Writable],
 *       stacktrace: [Array]
 *     }
 *   }
 * }
 * it will easily cause `Converting circular structure to JSON` error.
 * Thus, we only pick required fields to reformat the error.
 */
export const defaultApolloErrorHandler = (error: GraphQLError) => {
  if (error instanceof GraphQLError) {
    const code = (error.extensions?.code ||
      GeneralErrorCodes.INTERNAL_SERVER_ERROR) as GeneralErrorCodes;
    return {
      locations: error.locations,
      path: error.path,
      message: error.message,
      extensions: {
        code,
        message: error.message,
        shortMessage: shortMessages[code],
        stacktrace: error.extensions?.exception?.stacktrace,
        other: error.extensions?.other,
      },
    };
  }

  // Return the original error if it's not a GraphQLError
  return error;
};
