import { crc32 } from 'node:zlib';

/** A book to turn into an EPUB: chapters of plain paragraphs. */
export interface TestBook {
  readonly title: string;
  readonly author: string;
  readonly chapters: readonly { readonly title: string; readonly paragraphs: readonly string[] }[];
}

/**
 * Builds a minimal valid EPUB 2 in memory, so no binary fixture is versioned.
 *
 * @param book - Content of the book.
 * @returns EPUB bytes.
 */
export function buildEpub(book: TestBook): Buffer {
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const files: [string, string][] = [
    ['mimetype', 'application/epub+zip'],
    [
      'META-INF/container.xml',
      '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    ],
  ];
  const items = book.chapters.map((_, index) => `chapter${index + 1}.xhtml`);
  files.push([
    'OEBPS/content.opf',
    '<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id">' +
      '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
      `<dc:title>${escape(book.title)}</dc:title><dc:creator>${escape(book.author)}</dc:creator>` +
      '<dc:identifier id="id">e2e</dc:identifier><dc:language>fr</dc:language></metadata><manifest>' +
      items
        .map(
          (item, index) =>
            `<item id="c${index}" href="${item}" media-type="application/xhtml+xml"/>`,
        )
        .join('') +
      '</manifest><spine>' +
      items.map((_, index) => `<itemref idref="c${index}"/>`).join('') +
      '</spine></package>',
  ]);
  book.chapters.forEach((chapter, index) => {
    files.push([
      `OEBPS/${items[index]}`,
      '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="fr"><head><title></title></head><body>' +
        `<h1>${escape(chapter.title)}</h1>` +
        chapter.paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join('') +
        '</body></html>',
    ]);
  });
  return zipStored(files.map(([name, content]) => [name, Buffer.from(content, 'utf8')]));
}

/** Writes a ZIP archive without compression, which EPUB readers accept and requires no dependency. */
function zipStored(entries: [string, Buffer][]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const fileName = Buffer.from(name, 'utf8');
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(fileName.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(fileName.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, fileName, data);
    centrals.push(central, fileName);
    offset += local.length + fileName.length + data.length;
  }
  const centralSize = centrals.reduce((size, part) => size + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}
