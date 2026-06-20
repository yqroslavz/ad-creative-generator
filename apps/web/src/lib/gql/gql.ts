/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query Projects {\n    projects {\n      id\n      name\n      adNetwork\n      offerDescription\n      targetAudience\n      landingPageUrl\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.ProjectsDocument,
    "\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      adNetwork\n      offerDescription\n      targetAudience\n      landingPageUrl\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.ProjectDocument,
    "\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n    }\n  }\n": typeof types.CreateProjectDocument,
    "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n": typeof types.DeleteProjectDocument,
    "\n  mutation GenerateCreatives($input: GenerateCreativesInput!) {\n    generateCreatives(input: $input) {\n      id\n      status\n      n\n      createdAt\n    }\n  }\n": typeof types.GenerateCreativesDocument,
    "\n  query MyGenerations($projectId: ID) {\n    myGenerations(projectId: $projectId) {\n      id\n      projectId\n      status\n      n\n      textProviderUsed\n      imageModeUsed\n      error\n      startedAt\n      finishedAt\n      createdAt\n      creatives {\n        id\n        position\n        headline\n        description\n        cta\n        imageUrl\n      }\n    }\n  }\n": typeof types.MyGenerationsDocument,
    "\n  query MyApiKeys {\n    myApiKeys {\n      provider\n      keyPreview\n      createdAt\n      lastUsedAt\n    }\n  }\n": typeof types.MyApiKeysDocument,
    "\n  mutation SaveApiKey($input: SaveApiKeyInput!) {\n    saveApiKey(input: $input) {\n      provider\n      keyPreview\n      createdAt\n      lastUsedAt\n    }\n  }\n": typeof types.SaveApiKeyDocument,
    "\n  mutation DeleteApiKey($provider: TextProvider!) {\n    deleteApiKey(provider: $provider)\n  }\n": typeof types.DeleteApiKeyDocument,
    "\n  mutation RegenerateCreative($creativeId: ID!) {\n    regenerateCreative(creativeId: $creativeId) {\n      id\n    }\n  }\n": typeof types.RegenerateCreativeDocument,
    "\n  mutation RetryGeneration($id: ID!) {\n    retryGeneration(id: $id) {\n      id\n      status\n    }\n  }\n": typeof types.RetryGenerationDocument,
    "\n  query MyBalance {\n    myBalance\n  }\n": typeof types.MyBalanceDocument,
    "\n  mutation CreateCheckoutSession($tier: BillingTier!) {\n    createCheckoutSession(tier: $tier) {\n      url\n    }\n  }\n": typeof types.CreateCheckoutSessionDocument,
};
const documents: Documents = {
    "\n  query Projects {\n    projects {\n      id\n      name\n      adNetwork\n      offerDescription\n      targetAudience\n      landingPageUrl\n      createdAt\n      updatedAt\n    }\n  }\n": types.ProjectsDocument,
    "\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      adNetwork\n      offerDescription\n      targetAudience\n      landingPageUrl\n      createdAt\n      updatedAt\n    }\n  }\n": types.ProjectDocument,
    "\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n    }\n  }\n": types.CreateProjectDocument,
    "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n": types.DeleteProjectDocument,
    "\n  mutation GenerateCreatives($input: GenerateCreativesInput!) {\n    generateCreatives(input: $input) {\n      id\n      status\n      n\n      createdAt\n    }\n  }\n": types.GenerateCreativesDocument,
    "\n  query MyGenerations($projectId: ID) {\n    myGenerations(projectId: $projectId) {\n      id\n      projectId\n      status\n      n\n      textProviderUsed\n      imageModeUsed\n      error\n      startedAt\n      finishedAt\n      createdAt\n      creatives {\n        id\n        position\n        headline\n        description\n        cta\n        imageUrl\n      }\n    }\n  }\n": types.MyGenerationsDocument,
    "\n  query MyApiKeys {\n    myApiKeys {\n      provider\n      keyPreview\n      createdAt\n      lastUsedAt\n    }\n  }\n": types.MyApiKeysDocument,
    "\n  mutation SaveApiKey($input: SaveApiKeyInput!) {\n    saveApiKey(input: $input) {\n      provider\n      keyPreview\n      createdAt\n      lastUsedAt\n    }\n  }\n": types.SaveApiKeyDocument,
    "\n  mutation DeleteApiKey($provider: TextProvider!) {\n    deleteApiKey(provider: $provider)\n  }\n": types.DeleteApiKeyDocument,
    "\n  mutation RegenerateCreative($creativeId: ID!) {\n    regenerateCreative(creativeId: $creativeId) {\n      id\n    }\n  }\n": types.RegenerateCreativeDocument,
    "\n  mutation RetryGeneration($id: ID!) {\n    retryGeneration(id: $id) {\n      id\n      status\n    }\n  }\n": types.RetryGenerationDocument,
    "\n  query MyBalance {\n    myBalance\n  }\n": types.MyBalanceDocument,
    "\n  mutation CreateCheckoutSession($tier: BillingTier!) {\n    createCheckoutSession(tier: $tier) {\n      url\n    }\n  }\n": types.CreateCheckoutSessionDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Projects {\n    projects {\n      id\n      name\n      adNetwork\n      offerDescription\n      targetAudience\n      landingPageUrl\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query Projects {\n    projects {\n      id\n      name\n      adNetwork\n      offerDescription\n      targetAudience\n      landingPageUrl\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      adNetwork\n      offerDescription\n      targetAudience\n      landingPageUrl\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      adNetwork\n      offerDescription\n      targetAudience\n      landingPageUrl\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  mutation CreateProject($input: CreateProjectInput!) {\n    createProject(input: $input) {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation GenerateCreatives($input: GenerateCreativesInput!) {\n    generateCreatives(input: $input) {\n      id\n      status\n      n\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  mutation GenerateCreatives($input: GenerateCreativesInput!) {\n    generateCreatives(input: $input) {\n      id\n      status\n      n\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MyGenerations($projectId: ID) {\n    myGenerations(projectId: $projectId) {\n      id\n      projectId\n      status\n      n\n      textProviderUsed\n      imageModeUsed\n      error\n      startedAt\n      finishedAt\n      createdAt\n      creatives {\n        id\n        position\n        headline\n        description\n        cta\n        imageUrl\n      }\n    }\n  }\n"): (typeof documents)["\n  query MyGenerations($projectId: ID) {\n    myGenerations(projectId: $projectId) {\n      id\n      projectId\n      status\n      n\n      textProviderUsed\n      imageModeUsed\n      error\n      startedAt\n      finishedAt\n      createdAt\n      creatives {\n        id\n        position\n        headline\n        description\n        cta\n        imageUrl\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MyApiKeys {\n    myApiKeys {\n      provider\n      keyPreview\n      createdAt\n      lastUsedAt\n    }\n  }\n"): (typeof documents)["\n  query MyApiKeys {\n    myApiKeys {\n      provider\n      keyPreview\n      createdAt\n      lastUsedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SaveApiKey($input: SaveApiKeyInput!) {\n    saveApiKey(input: $input) {\n      provider\n      keyPreview\n      createdAt\n      lastUsedAt\n    }\n  }\n"): (typeof documents)["\n  mutation SaveApiKey($input: SaveApiKeyInput!) {\n    saveApiKey(input: $input) {\n      provider\n      keyPreview\n      createdAt\n      lastUsedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteApiKey($provider: TextProvider!) {\n    deleteApiKey(provider: $provider)\n  }\n"): (typeof documents)["\n  mutation DeleteApiKey($provider: TextProvider!) {\n    deleteApiKey(provider: $provider)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RegenerateCreative($creativeId: ID!) {\n    regenerateCreative(creativeId: $creativeId) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation RegenerateCreative($creativeId: ID!) {\n    regenerateCreative(creativeId: $creativeId) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RetryGeneration($id: ID!) {\n    retryGeneration(id: $id) {\n      id\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation RetryGeneration($id: ID!) {\n    retryGeneration(id: $id) {\n      id\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MyBalance {\n    myBalance\n  }\n"): (typeof documents)["\n  query MyBalance {\n    myBalance\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCheckoutSession($tier: BillingTier!) {\n    createCheckoutSession(tier: $tier) {\n      url\n    }\n  }\n"): (typeof documents)["\n  mutation CreateCheckoutSession($tier: BillingTier!) {\n    createCheckoutSession(tier: $tier) {\n      url\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;