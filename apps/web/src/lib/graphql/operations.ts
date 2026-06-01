import { graphql } from '@/lib/gql';

graphql(/* GraphQL */ `
  query Projects {
    projects {
      id
      name
      adNetwork
      offerDescription
      targetAudience
      landingPageUrl
      createdAt
      updatedAt
    }
  }
`);

graphql(/* GraphQL */ `
  query Project($id: ID!) {
    project(id: $id) {
      id
      name
      adNetwork
      offerDescription
      targetAudience
      landingPageUrl
      createdAt
      updatedAt
    }
  }
`);

graphql(/* GraphQL */ `
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
    }
  }
`);

graphql(/* GraphQL */ `
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`);

graphql(/* GraphQL */ `
  mutation GenerateCreatives($input: GenerateCreativesInput!) {
    generateCreatives(input: $input) {
      id
      status
      n
      createdAt
    }
  }
`);

graphql(/* GraphQL */ `
  query MyGenerations($projectId: ID) {
    myGenerations(projectId: $projectId) {
      id
      projectId
      status
      n
      textProviderUsed
      imageModeUsed
      error
      startedAt
      finishedAt
      createdAt
      creatives {
        id
        position
        headline
        description
        cta
        imageUrl
      }
    }
  }
`);

graphql(/* GraphQL */ `
  query MyApiKeys {
    myApiKeys {
      provider
      keyPreview
      createdAt
      lastUsedAt
    }
  }
`);

graphql(/* GraphQL */ `
  mutation SaveApiKey($input: SaveApiKeyInput!) {
    saveApiKey(input: $input) {
      provider
      keyPreview
      createdAt
      lastUsedAt
    }
  }
`);

graphql(/* GraphQL */ `
  mutation DeleteApiKey($provider: TextProvider!) {
    deleteApiKey(provider: $provider)
  }
`);

export {
  ProjectsDocument,
  ProjectDocument,
  CreateProjectDocument,
  DeleteProjectDocument,
  GenerateCreativesDocument,
  MyGenerationsDocument,
  MyApiKeysDocument,
  SaveApiKeyDocument,
  DeleteApiKeyDocument,
} from '@/lib/gql/graphql';
