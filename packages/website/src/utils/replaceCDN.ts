import env from '../../env';

const replaceCDN = (value: string) => {
  return value.replace(/\{\{site\.(\w+)\}\}/g, (_, matched: string) => {
    if (!Object.prototype.hasOwnProperty.call(env, matched)) {
      throw new Error(`Unknown site variable: ${matched}`);
    }
    return matched === 'cdn' ? process.env.cdn ?? env.cdn : env[matched as keyof typeof env];
  });
};

export default replaceCDN;
