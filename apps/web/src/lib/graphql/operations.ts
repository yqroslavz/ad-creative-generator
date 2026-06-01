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

export {
  ProjectsDocument,
  ProjectDocument,
  CreateProjectDocument,
  DeleteProjectDocument,
} from '@/lib/gql/graphql';
