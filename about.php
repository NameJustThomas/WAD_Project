<?php

include 'config.php';

session_start();

$user_id = $_SESSION['user_id'];

if(!isset($user_id)){
   header('location:login.php');
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
   <meta charset="UTF-8">
   <meta http-equiv="X-UA-Compatible" content="IE=edge">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <title>About Us</title>

   <!-- font awesome cdn link  -->
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

   <!-- custom css file link  -->
   <link rel="stylesheet" href="css/style.css">

</head>
<body>
   
<?php include 'header.php'; ?>

<div class="heading">
   <h3>About Us</h3>
   <p> <a href="home.php">Home </a>/ About</p>
</div>

<section class="about">

   <div class="flex">

      <div class="image">
         <img src="images/about-img.jpg" alt="">
      </div>

      <div class="content">
         <h3>Who we are ? </h3>
         <p>
            Hello, friends! My partner and I, both recently college students, 
            decided to create an online store so that we could gain real-worlds 
            experience in the web design fields. Our great online store offers a delightfully 
            broad assortment of good items that have been carefully chosen and with affordable priced to meet your picky preferences. 
            We take exceptional customer service and ensuring that you are entirely happy with every purchase. 
            We appreciate your visit to our site and hope you had a pleasant experience. We hope to see you soon!
         </p>
         
         <a href="contact.php" class="btn">Any Question ?</a>
      </div>

   </div>

</section>



<section class="authors">

   <h1 class="title">Our Owners</h1>

   <div class="box-container">

      <div class="box">
         <img src="images/author1.jpg" alt="author">
         <div class="share">
            <a href="https://www.facebook.com/dangkhaiduong/" class="fab fa-facebook-f"></a>
         </div>
         <h3>KHẢI DƯƠNG</h3>
      </div>

      <div class="box">
         <img src="images/author2.jpg" alt="author">
         <div class="share">
            <a href="https://www.facebook.com/thinh.vo.1656854?mibextid=LQQJ4d" class="fab fa-facebook-f"></a>
         </div>
         <h3>HUY THỊNH</h3>
      </div>
   </div>

</section>







<?php include 'footer.php'; ?>

<!-- custom js file link  -->
<script src="js/script.js"></script>

</body>
</html>