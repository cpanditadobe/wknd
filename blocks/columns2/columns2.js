export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns2-${cols.length}-cols`);
}
