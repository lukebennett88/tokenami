import * as Supports from './supports';

/* -------------------------------------------------------------------------------------------------
 * GridProperty
 * -----------------------------------------------------------------------------------------------*/

type GridProperty = '--_grid';
const gridPropertyRegex = /--_grid/;

const GridProperty = {
  safeParse: (input: unknown) => validate<GridProperty>(gridPropertyRegex, input),
};

function gridProperty(): GridProperty {
  return `--_grid`;
}

/* -------------------------------------------------------------------------------------------------
 * GridValue
 * -----------------------------------------------------------------------------------------------*/

type GridValue = number;
const gridValueRegex = /^\d+/;

const GridValue = {
  safeParse: (input: unknown) => validate<GridValue>(gridValueRegex, input),
};

/* -------------------------------------------------------------------------------------------------
 * TokenProperty
 * -----------------------------------------------------------------------------------------------*/

type TokenProperty<P extends string = string> = `--${P}`;
const tokenPropertyRegex = /(?<!var\()--(\w([\w-]+)?)/;

const TokenProperty = {
  safeParse: (input: unknown) => validate<TokenProperty>(tokenPropertyRegex, input),
};

function tokenProperty(name: string): TokenProperty {
  return `--${name}`;
}

/* -------------------------------------------------------------------------------------------------
 * VariantProperty
 * -----------------------------------------------------------------------------------------------*/

type VariantProperty<P extends string = string, V extends string = string> = `--${V}_${P}`;
const variantPropertyRegex = /(?<!var\()--((\w)([\w-]+)_([\w-]+))/;

const VariantProperty = {
  safeParse: (input: unknown) => validate<VariantProperty>(variantPropertyRegex, input),
};

function variantProperty(variant: string, name: string): TokenProperty {
  return `--${variant}_${name}`;
}

/* -------------------------------------------------------------------------------------------------
 * TokenValue
 * -----------------------------------------------------------------------------------------------*/

type TokenValue<TK extends string = string, V extends string = string> = `var(--${TK}_${V})`;
const tokenValueRegex = /var\((--([\w-]+)_([\w-]+))\)/;

const TokenValue = {
  safeParse: (input: unknown) => validate<TokenValue>(tokenValueRegex, input),
};

function tokenValue<TK extends string, N extends string>(themeKey: TK, name: N): TokenValue<TK, N> {
  return `var(--${themeKey}_${name})`;
}

/* -------------------------------------------------------------------------------------------------
 * ArbitraryValue
 * -----------------------------------------------------------------------------------------------*/

type ArbitraryValue = `var(---,${string})`;
const arbitraryValueRegex = /var\(---,(.+)\)/;

const ArbitraryValue = {
  safeParse: (input: unknown) => validate<ArbitraryValue>(arbitraryValueRegex, input),
};

function arbitraryValue(value: string): ArbitraryValue {
  return `var(---,${value})`;
}

/* -------------------------------------------------------------------------------------------------
 * Validate
 * -----------------------------------------------------------------------------------------------*/

type Validated<T> = { success: true; output: T } | { success: false };

function validate<T>(regex: RegExp, input: unknown): Validated<T> {
  try {
    const inputString = String(input);
    if (regex.test(inputString)) {
      return { success: true, output: inputString as T };
    } else {
      return { success: false };
    }
  } catch (e) {
    return { success: false };
  }
}

/* -------------------------------------------------------------------------------------------------
 * Config
 * -----------------------------------------------------------------------------------------------*/

type ThemeKey =
  | 'alpha'
  | 'border'
  | 'color'
  | 'ease'
  | 'font-size'
  | 'leading'
  | 'line-style'
  | 'radii'
  | 'size'
  | 'shadow'
  | 'tracking'
  | 'transition'
  | 'weight'
  | 'z'
  | (string & {});

type ThemeValues = Record<string, string>;
type Theme = Partial<Record<ThemeKey, ThemeValues>>;
type Aliases = Record<string, readonly Supports.CSSProperty[]>;
type PropertiesOptions = readonly ('grid' | ThemeKey)[];

type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

type Exact<T, V extends T> = Exclude<keyof V, keyof T> extends never ? V : T;

interface Config
  extends DeepReadonly<{
    include: string[];
    exclude?: string[];
    grid?: string;
    responsive?: { [atRule: string]: string };
    selectors?: { [name: string]: string | string[] };
    keyframes?: { [name: string]: { [step: string]: { [cssProperty: string]: string } } };
    aliases?: Aliases;
    theme: Theme;
    properties?: Partial<Record<Supports.CSSProperty, PropertiesOptions>>;
  }> {}

/* -------------------------------------------------------------------------------------------------
 * createConfig
 * -----------------------------------------------------------------------------------------------*/

const createConfig = <T extends Config>(obj: Exact<Config, T>): DeepReadonly<T> => {
  return obj as DeepReadonly<T>;
};

/* -------------------------------------------------------------------------------------------------
 * getTokenPropertyName
 * -----------------------------------------------------------------------------------------------*/

function getTokenPropertyName(tokenProperty: TokenProperty) {
  return tokenProperty.replace(tokenPropertyRegex, '$1');
}

/* -------------------------------------------------------------------------------------------------
 * getTokenPropertySplit
 * -----------------------------------------------------------------------------------------------*/

function getTokenPropertySplit(tokenProperty: TokenProperty) {
  const name = getTokenPropertyName(tokenProperty);
  const [alias, ...variants] = name.split('_').reverse() as [string, ...string[]];
  return { alias, variants: variants.reverse() };
}

/* -------------------------------------------------------------------------------------------------
 * getTokenPropertyParts
 * -----------------------------------------------------------------------------------------------*/

type PropertyParts = {
  name: string;
  alias: string;
  responsive?: string;
  selector?: string;
  variant?: string;
};

function getTokenPropertyParts(tokenProperty: TokenProperty, config: Config): PropertyParts | null {
  const name = getTokenPropertyName(tokenProperty);
  const { alias, variants } = getTokenPropertySplit(tokenProperty);
  const [firstVariant, secondVariant] = variants;
  const firstSelector = config.selectors?.[firstVariant!] && firstVariant;
  const secondSelector = config.selectors?.[secondVariant!] && secondVariant;
  const responsive = config.responsive?.[firstVariant!] && firstVariant;
  const selector = firstSelector || secondSelector;
  const validVariant = [responsive, selector].filter(Boolean).join('_');
  if (firstVariant && variantProperty(validVariant, alias) !== tokenProperty) return null;
  return { name, alias, responsive, selector, variant: validVariant };
}

/* -------------------------------------------------------------------------------------------------
 * getTokenValueParts
 * -----------------------------------------------------------------------------------------------*/

function getTokenValueParts(tokenValue: TokenValue) {
  type Parts = [string, string, string, string];
  const [, property, themeKey, token] = tokenValue.split(tokenValueRegex) as Parts;
  return { property, themeKey, token };
}

/* -------------------------------------------------------------------------------------------------
 * getCSSPropertiesForAlias
 * -------------------------------------------------------------------------------------------------
 * an alias can be used for multiple CSS properties e.g. `px` can apply to `padding-left`
 * and `padding-right`, so this gets an array of CSS properties for a given alias.
 * -----------------------------------------------------------------------------------------------*/

function getCSSPropertiesForAlias(
  alias: string,
  aliases: Config['aliases']
): Supports.CSSProperty[] {
  return (aliases as any)?.[alias] || [alias];
}

/* ---------------------------------------------------------------------------------------------- */

export type { Config, Theme, Aliases };
export {
  GridProperty,
  TokenProperty,
  VariantProperty,
  TokenValue,
  GridValue,
  ArbitraryValue,
  //
  gridProperty,
  tokenProperty,
  variantProperty,
  tokenValue,
  arbitraryValue,
  getTokenPropertyName,
  getTokenPropertySplit,
  getTokenPropertyParts,
  getTokenValueParts,
  getCSSPropertiesForAlias,
  createConfig,
};
