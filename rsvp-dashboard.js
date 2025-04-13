document.addEventListener('DOMContentLoaded', function() {
    const dashboardContainer = document.getElementById('dashboard-container');

    // Fetch data from Formcarry API
    fetch(`https://formcarry.com/s/C6atiqnXy-0?api_key=RMug62xr3IvpuwqQniaw5umHTnp7odj8h4YOF7I3DJRJT647A2UlF8yvaFEn8eHq`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Parse and display data
            displayData(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            dashboardContainer.innerHTML = `<p>Error fetching data: ${error.message}. Please try again later.</p>`;
        });

    function displayData(data) {
        if (data && data.data && data.data.length > 0) {
            const table = document.createElement('table');
            table.classList.add('dashboard-table');

            // Create table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const headers = ['Name', 'Email', 'Phone', 'Attending', 'Guests', 'Dietary Restrictions', 'Message'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Create table body
            const tbody = document.createElement('tbody');
            data.data.forEach(entry => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${entry.data.name}</td>
                    <td>${entry.data.email}</td>
                    <td>${entry.data.phone}</td>
                    <td>${entry.data.attending}</td>
                    <td>${entry.data.guestCount}</td>
                    <td>${entry.data.dietaryRestrictions}</td>
                    <td>${entry.data.message}</td>
                `;
                tbody.appendChild(row);
            });
            table.appendChild(tbody);

            dashboardContainer.appendChild(table);
        } else {
            dashboardContainer.innerHTML = '<p>No RSVP data available.</p>';
        }
    }
});
