<?php 
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Content-Type: application/json');

$servername = "localhost";
$username = "usr_eml_filter";
$password = "flm73*7O";
$dbname = "db_eml_filter";

$conn = new mysqli($servername, $username, $password, $dbname);


if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");

$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['action'])) {

    $action = $data['action'];
    switch ($action) {
        case 'MerchantData':
            Merchant($data);
            break;
        case 'MerchantId':
            getMerchantId($data);
            break;
        case 'MerchantAdditionalInfo':
            MerchantAdditionalInfo($data);
            break;
        case 'MerchantContact':
            merchantContact($data);
            break;
        default:
            $response = [
                'success' => false,
                'message' => 'Unknown action specified.',
            ];
            echo json_encode($response);
            break;
            }
  
        } else {
  
    $response = [
        'success' => false,
        'message' => 'Invalid request. Missing action parameter.',
    ];

    echo json_encode($response);
}

function Merchant($data)
{
    global $conn; 

    if (isset($data['data'])) {

        $merchantsData = $data['data'];
        // Extract variables from the $merchantsData array
        // Example usage:
         $merchantName = mysqli_real_escape_string($conn, $merchantsData['MerchantName']);
         $title = mysqli_real_escape_string($conn, $merchantsData['title']);
         $websiteLink = mysqli_real_escape_string($conn, $merchantsData['website']);
         $description = mysqli_real_escape_string($conn, $merchantsData['description']);
         $category = mysqli_real_escape_string($conn, $merchantsData['category']);
         $network_id = mysqli_real_escape_string($conn, $merchantsData['network_id']);

        $query = "INSERT IGNORE INTO aa_merchants (merchant_name, website, title, description, category, network, network_id) 
        VALUES ('$merchantName', '$websiteLink', '$title', '$description', '$category', 3, '$network_id')";

        $result = $conn->query($query);

        if ($result === TRUE) {
            $response = [
                'success' => true,
                'message' => 'Merchant received successfully!',
                'data' =>  $merchantsData,
            ];
            echo json_encode($response);
        } else {
            echo "Error: " . $conn->error;
        }
    } else {
        $response = [
            'success' => false,
            'message' => 'Invalid data format or missing required fields for scraped data.',
        ];
        echo json_encode($response);
    }
}

function getMerchantId($data)
{
    global $conn;

    if (isset($data['merchantName'])) {
        $merchantName = $data['merchantName'];
        $query = "SELECT id FROM aa_merchants WHERE merchant_name = '$merchantName'";
        $result = $conn->query($query);

        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $response = [
                'success' => true,
                'message' => 'Merchant found in the database.',
                'merchant_id' => $row['id'],
            ];
             echo json_encode($response);
        } else {
            $response = [
                'success' => false,
                'message' => 'Merchant not found in the database.',
            ];
            echo json_encode($response);
        }
    } else {
        $response = [
            'success' => false,
            'message' => 'Invalid data format or missing required fields.',
        ];
        echo json_encode($response);
        return null;
    }
}

function MerchantAdditionalInfo($data)
{
    global $conn;

    if (isset($data['data'], $data['merchant_id'])) {
        $additionalInfo = $data['data'];
        $MerchantId = $data['merchant_id'];

        foreach ($additionalInfo as $info) {
            $label = mysqli_real_escape_string($conn, $info['label']);
            $value = mysqli_real_escape_string($conn, $info['value']);

            // Check if the combination of label, value, and merchant_id already exists
            $checkExistenceQuery = "SELECT id FROM aa_merchants_additional_info WHERE label = '$label' AND value = '$value' AND merchant_id = $MerchantId";

            $resultExistence = $conn->query($checkExistenceQuery);

            if ($resultExistence->num_rows === 0) {
                // If the combination does not exist, insert the data
                $query = "INSERT INTO aa_merchants_additional_info (label, value, merchant_id) VALUES ('$label', '$value', $MerchantId)";
                $result = $conn->query($query);

                if (!$result) {
                    $response = [
                        'success' => false,
                        'message' => 'Error inserting additional info into the database.',
                    ];
                    echo json_encode($response);
                    return;
                }
            } else {
                // Return a message indicating that the combination already exists
                $response = [
                    'success' => false,
                    'message' => 'Combination already exists',
                ];
                echo json_encode($response);
                return;
            }
        }

        $response = [
            'success' => true,
            'message' => 'Merchant Additional Info data received and stored successfully!',
            'data' => $additionalInfo,
        ];
        echo json_encode($response);
    } else {
        $response = [
            'success' => false,
            'message' => 'Invalid data format or missing required fields for AdditionalInfo data.',
            'datatag' => $data,
        ];
        echo json_encode($response);
    }
}

function MerchantContact($data) {
    global $conn;

    if (isset($data['data']) && is_array($data['data'])) {
        foreach ($data['data'] as $entry) {
            // Escape the name, email, and phone to prevent SQL injection
            $name = mysqli_real_escape_string($conn, $entry['name']);
            $email = mysqli_real_escape_string($conn, $entry['email']);
            $telephone = mysqli_real_escape_string($conn, $entry['telephone']);
            $merchantId = $data['merchant_id']; 

            // Construct the query to check for the existence of the entry
            $checkExistenceQuery = "SELECT id FROM aa_merchants_contacts WHERE name = '$name' AND email = '$email' AND phone = '$telephone' AND merchant_id = $merchantId";
            $resultExistence = $conn->query($checkExistenceQuery);

            // If the entry does not exist, insert it
            if ($resultExistence->num_rows === 0) {
                $query = "INSERT INTO aa_merchants_contacts (name, email, phone, merchant_id) VALUES ('$name', '$email', '$telephone', $merchantId)";
                $result = $conn->query($query);

                if (!$result) {
                    $response = [
                        'success' => false,
                        'message' => 'Error inserting data into the database.',
                    ];
                    echo json_encode($response);
                    return;
                }
            }
        }

        $response = [
            'success' => true,
            'message' => 'Data received and stored successfully!',
            'data' => $data,
        ];
        echo json_encode($response);
    } else {
        $response = [
            'success' => false,
            'message' => 'Invalid data format or missing data.',
            'data' => $data,
        ];
        echo json_encode($response);
    }
}

?>