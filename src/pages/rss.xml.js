import rss from '@astrojs/rss';
import { render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getDb, withGames } from '../lib/db';
import { latestDownloadDate } from '../lib/game';
import { displayTitle, statusClass, toLabel } from '../lib/game';
import { resolveCreatorNamesLabel } from '../lib/credits';
import { getVocab, vocabShort } from '../lib/search/vocab';
import { patchUrl } from '../lib/url';

export async function GET(context) {
  const db = await getDb();
  const container = await AstroContainer.create();

  const recentCandidates = db.patches.filter((p) => p.data.downloads.length > 0);
  const recentWithGame = withGames(db, recentCandidates)
    .map(({ patch, game }) => ({ patch, game, latest: latestDownloadDate(patch) }))
    .filter((x) => x.latest !== null)
    .sort((a, b) => b.latest.getTime() - a.latest.getTime())
    .slice(0, 20); // a bit more headroom than the homepage's 10, since feed readers batch these

  const vocab = await getVocab();
  const platformsVocab = vocab.get('platforms');
  const statusesVocab = vocab.get('statuses');

  const items = await Promise.all(
    recentWithGame.map(async ({ patch, game, latest }) => {
      const title = displayTitle(game, patch);
      const creatorLabel = await resolveCreatorNamesLabel(patch);
      const statusLabel = toLabel(statusesVocab, patch.data.status);
      const platformLabels = patch.data.platforms.map((p) => vocabShort(platformsVocab, p)).join(', ');
      const bannerSrc = game.data.grid?.src;
      const bannerUrl = bannerSrc ? new URL(bannerSrc, context.site).href : null;
      const link = patchUrl(game, patch);

      // render() gives back a Content component; Astro's Container API renders it to an HTML string.
      const { Content } = await render(patch);
      const descriptionHtml = await container.renderToString(Content);

      // Full HTML body for feed readers that render content:encoded
      const contentHtml = `
        ${bannerUrl ? `<img src="${bannerUrl}" alt="${title}" /><br/>` : ''}
        <p><strong>Patch por:</strong> ${creatorLabel}</p>
        <p><strong>Status:</strong> ${statusLabel}</p>
        <p><strong>Plataformas:</strong> ${platformLabels}</p>
        ${descriptionHtml}
      `.trim();

      return {
        title,
        pubDate: latest,
        link,
        // description field wants plain text, strip tags for a short excerpt
        description: descriptionHtml.replace(/<[^>]+>/g, ' ').trim().slice(0, 300),
        content: contentHtml,
      };
    })
  );

  return rss({
    title: 'Patcheados',
    description: 'Traduções brasileiras feitas por fãs para jogos | Atualizações Recentes',
    site: context.site,
    items,
    customData: `<language>pt-br</language>`,
  });
}
