// JavaScript for cliente form interaction

// Function to handle cliente form submission
function handleClienteSubmit(event) {
    event.preventDefault(); // Prevent default form submission

    // Collect form data
    const formData = new FormData(event.target);
    const clienteData = {};

    for (const [key, value] of formData.entries()) {
        clienteData[key] = value;
    }

    // Send data to server
    fetch('/api/clientes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(clienteData),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        // Handle success (e.g., show a message, redirect, etc.)
    })
    .catch((error) => {
        console.error('Error:', error);
        // Handle error
    });
}

// Attach the event listener to the form
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('clienteForm');
    if (form) {
        form.addEventListener('submit', handleClienteSubmit);
    }
});