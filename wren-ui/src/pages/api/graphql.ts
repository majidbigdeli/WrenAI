import microCors from 'micro-cors';
import { NextApiRequest, NextApiResponse, PageConfig } from 'next';
import { ApolloServer } from 'apollo-server-micro';
import { typeDefs } from '@server';
import resolvers from '@server/resolvers';
import { IContext } from '@server/types';
import { GraphQLError } from 'graphql';
import { getLogger } from '@server/utils';
import { getConfig } from '@server/config';
import { ModelService } from '@server/services/modelService';
import {
  defaultApolloErrorHandler,
  GeneralErrorCodes,
} from '@/apollo/server/utils/error';
import { TelemetryEvent } from '@/apollo/server/telemetry/telemetry';
import { components } from '@/common';
import { ProjectService } from '@/apollo/server/services/projectService';
import { DashboardService } from '@server/services/dashboardService';
import { AskingService } from '@/apollo/server/services';
import { DashboardCacheBackgroundTracker } from '@/apollo/server/backgrounds';

const serverConfig = getConfig();
const logger = getLogger('APOLLO');
logger.level = 'debug';

const cors = microCors();

export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
};

const bootstrapServer = async () => {
  const {
    telemetry,

    // repositories
    projectRepository,
    modelRepository,
    modelColumnRepository,
    relationRepository,
    deployLogRepository,
    viewRepository,
    schemaChangeRepository,
    learningRepository,
    modelNestedColumnRepository,
    dashboardRepository,
    dashboardItemRepository,
    sqlPairRepository,
    instructionRepository,
    apiHistoryRepository,
    dashboardItemRefreshJobRepository,
    threadRepository,
    threadResponseRepository,
    askingTaskRepository,
    // adaptors
    wrenEngineAdaptor,
    ibisAdaptor,
    wrenAIAdaptor,

    // services
    queryService,
    askingService,
    deployService,
    mdlService,
    sqlPairService,

    instructionService,
    // background trackers
    projectRecommendQuestionBackgroundTracker,
    threadRecommendQuestionBackgroundTracker,
    //dashboardCacheBackgroundTracker,
    metadataService,
    askingTaskTracker,
  } = components;

  // const modelService = new ModelService({
  //   projectService,
  //   modelRepository,
  //   modelColumnRepository,
  //   relationRepository,
  //   viewRepository,
  //   mdlService,
  //   wrenEngineAdaptor,
  //   queryService,
  // });

  // initialize services
  await Promise.all([
    askingService.initialize(),
    projectRecommendQuestionBackgroundTracker.initialize(),
    threadRecommendQuestionBackgroundTracker.initialize(),
  ]);

  const apolloServer: ApolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (error: GraphQLError) => {
      // stop print error stacktrace of dry run error
      if (error.extensions?.code === GeneralErrorCodes.DRY_RUN_ERROR) {
        return defaultApolloErrorHandler(error);
      }

      // print error stacktrace of graphql error
      const stacktrace = error.extensions?.exception?.stacktrace;
      if (stacktrace) {
        logger.error(stacktrace.join('\n'));
      }

      // print original error stacktrace
      const originalError = error.extensions?.originalError as Error;
      if (originalError) {
        logger.error(`== original error ==`);
        // error may not have stack, so print error message if stack is not available
        logger.error(originalError.stack || originalError.message);
      }

      // telemetry: capture internal server error
      if (error.extensions?.code === GeneralErrorCodes.INTERNAL_SERVER_ERROR) {
        telemetry.sendEvent(
          TelemetryEvent.GRAPHQL_ERROR,
          {
            originalErrorStack: originalError?.stack,
            originalErrorMessage: originalError?.message,
            errorMessage: error.message,
          },
          error.extensions?.service,
          false,
        );
      }
      return defaultApolloErrorHandler(error);
    },
    introspection: process.env.NODE_ENV !== 'production',
    context: ({ req }): IContext => {
      const rawHost = req.headers.host || '';
      const hostOnly = rawHost.split(':')[0];
      const scopedProjectService = new ProjectService({
        projectRepository,
        metadataService, // اگر از components گرفتیش
        mdlService,
        wrenAIAdaptor,
        telemetry,
        requestHost: hostOnly,
      });

      const scopedModelService = new ModelService({
        projectService: scopedProjectService,
        modelRepository,
        modelColumnRepository,
        relationRepository,
        viewRepository,
        mdlService,
        wrenEngineAdaptor,
        queryService,
      });

      const scopedDashboardService = new DashboardService({
        projectService: scopedProjectService,
        dashboardItemRepository,
        dashboardRepository,
      });

      const scopedAskingService = new AskingService({
        telemetry,
        wrenAIAdaptor,
        deployService,
        projectService: scopedProjectService,
        viewRepository,
        threadRepository,
        threadResponseRepository,
        queryService,
        mdlService,
        askingTaskTracker,
        askingTaskRepository,
      });

      const scopeDashboardCacheBackgroundTracker =
        new DashboardCacheBackgroundTracker({
          dashboardRepository,
          dashboardItemRepository,
          dashboardItemRefreshJobRepository,
          projectService: scopedProjectService,
          deployService,
          queryService,
        });

      return {
        config: serverConfig,
        telemetry,
        // adaptor
        wrenEngineAdaptor,
        ibisServerAdaptor: ibisAdaptor,
        wrenAIAdaptor,
        // services
        projectService: scopedProjectService,
        modelService: scopedModelService,
        mdlService,
        deployService,
        askingService: scopedAskingService,
        queryService,
        dashboardService: scopedDashboardService,
        sqlPairService,
        instructionService,
        // repository
        projectRepository,
        modelRepository,
        modelColumnRepository,
        modelNestedColumnRepository,
        relationRepository,
        viewRepository,
        deployRepository: deployLogRepository,
        schemaChangeRepository,
        learningRepository,
        dashboardRepository,
        dashboardItemRepository,
        sqlPairRepository,
        instructionRepository,
        apiHistoryRepository,
        dashboardItemRefreshJobRepository,
        // background trackers
        projectRecommendQuestionBackgroundTracker,
        threadRecommendQuestionBackgroundTracker,
        dashboardCacheBackgroundTracker: scopeDashboardCacheBackgroundTracker,

        requestHost: hostOnly,
      };
    },
  });
  await apolloServer.start();
  return apolloServer;
};

const startServer = bootstrapServer();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const apolloServer = await startServer;
  await apolloServer.createHandler({
    path: '/api/graphql',
  })(req, res);
};

export default cors((req: NextApiRequest, res: NextApiResponse) =>
  req.method === 'OPTIONS' ? res.status(200).end() : handler(req, res),
);
