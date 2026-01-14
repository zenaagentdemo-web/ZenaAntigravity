import { api } from '../src/utils/apiClient';

// Helper to check if the modal exists in the DOM
function checkModalExistence() {
    const modal = document.querySelector('.zena-conflict-modal-overlay');
    if (modal) {
        const style = window.getComputedStyle(modal);
        console.log('Modal found!');
        console.log('Z-Index:', style.zIndex);
        console.log('Visibility:', style.visibility);
        console.log('Display:', style.display);
        console.log('Opacity:', style.opacity);
    } else {
        console.log('Modal NOT found in DOM.');
    }
}
// This is a frontend script, can't run it via node.
// I will just rely on inspection.
