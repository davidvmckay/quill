export {};

const initialData = {
  name: 'Wall-E',
  location: 'Earth',
  // `about` is a Delta object
  // Learn more at: https://quilljs.com/docs/delta
  about: [
    {
      insert:
        'A robot who has developed sentience, and is the only robot of his kind shown to be still functioning on Earth.\n',
    },
  ],
};

const quill = new Quill('#editor', {
  modules: {
    toolbar: [
      ['bold', 'italic'],
      ['link', 'blockquote', 'code-block', 'image'],
      [{ list: 'ordered' }, { list: 'bullet' }],
    ],
  },
  theme: 'snow',
});

const nameInput = document.querySelector<HTMLInputElement>('[name="name"]');
const locationInput = document.querySelector<HTMLInputElement>('[name="location"]');
const form = document.querySelector('form');
const resetButton = document.querySelector('#resetForm');
if (!nameInput || !locationInput || !form || !resetButton) {
  throw new Error('The form example is missing its required controls');
}

const resetForm = () => {
  nameInput.value = initialData.name;
  locationInput.value = initialData.location;
  quill.setContents(initialData.about);
};

resetForm();

form.addEventListener('formdata', (event) => {
  // Append Quill content before submitting
  event.formData.append('about', JSON.stringify(quill.getContents().ops));
});

resetButton.addEventListener('click', () => {
  resetForm();
});



window.quill = quill;
