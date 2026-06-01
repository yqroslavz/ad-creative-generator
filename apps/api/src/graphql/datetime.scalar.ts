import { Scalar, CustomScalar } from '@nestjs/graphql';
import { GraphQLError, Kind, ValueNode } from 'graphql';

@Scalar('DateTime')
export class DateTimeScalar implements CustomScalar<string, Date> {
  description = 'ISO-8601 DateTime scalar';

  parseValue(value: unknown): Date {
    if (typeof value !== 'string')
      throw new GraphQLError('DateTime must be an ISO string');
    return new Date(value);
  }

  serialize(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return new Date(value).toISOString();
    throw new GraphQLError('DateTime value must be a Date or ISO string');
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind !== Kind.STRING)
      throw new GraphQLError('DateTime literal must be a string');
    return new Date(ast.value);
  }
}
