function loadDoctors() {

  let token = localStorage.getItem("token");

  fetch("http://localhost:8080/doctors", {
    headers: {
      "Authorization": "Bearer " + token
    }
  })
  .then(res => res.json())
  .then(data => {

    let output = "<h3>Doctors List</h3>";

    data.forEach(d => {
      output += d.name + " - " + d.specialty + "<br>";
    });

    document.getElementById("doctors").innerHTML = output;
  })
  .catch(err => alert("Unauthorized Access"));
}
function logout() {
  localStorage.clear();
  alert("Logged Out Successfully");
  window.location.href = "login.html";
}