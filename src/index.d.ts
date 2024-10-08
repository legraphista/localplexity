declare module '*.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';

declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}