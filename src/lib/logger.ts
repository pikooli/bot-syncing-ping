export const logger = {
  info: (message: any, ...optionalParams: any[]) => {
    console.log(message, ...optionalParams);
  },
  error: (message: any, ...optionalParams: any[]) => {
    console.error(message, ...optionalParams);
  },
};
