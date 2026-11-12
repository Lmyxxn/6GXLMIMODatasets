const viewSwitch = document.querySelector('.view-switch');
const layoutImages = document.querySelectorAll('.layout-card img');
const viewButtons = viewSwitch.querySelectorAll('[data-view]');
const viewLabels = { '3d': '3D view', plan: 'Top view' };

for (const button of viewButtons) {
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;

    const view = button.dataset.view;
    for (const image of layoutImages) {
      image.src = `ground-assets/paper-layouts/${image.dataset.layout}-${view}.webp`;
      image.alt = image.alt.replace(/^(3D view|Top view)/, viewLabels[view]);
    }
    for (const option of viewButtons) {
      option.setAttribute('aria-pressed', String(option === button));
    }
  });
}

viewSwitch.hidden = false;
