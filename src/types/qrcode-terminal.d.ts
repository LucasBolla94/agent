declare module "qrcode-terminal" {
  type QrOptions = {
    small?: boolean;
  };

  const qrcode: {
    generate: (input: string, options?: QrOptions) => void;
  };

  export default qrcode;
}
